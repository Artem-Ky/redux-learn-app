import {
  configureStore,
  createAction,
  createListenerMiddleware,
  createSlice,
  type ForkedTask,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── slice ────────────────────────────────────────────────────────────
interface PollState { ticks: number; heartbeats: number }
const initial: PollState = { ticks: 0, heartbeats: 0 }

const slice = createSlice({
  name: 'poll',
  initialState: initial,
  reducers: {
    tick: (s) => { s.ticks += 1 },
    heartbeat: (s) => { s.heartbeats += 1 },
    reset: () => initial,
  },
})
const { tick, heartbeat, reset } = slice.actions

const pollStart = createAction('poll/start')
const pollStop = createAction('poll/stop')

// ── listener middleware ──────────────────────────────────────────────
const listenerMiddleware = createListenerMiddleware()

const store = configureStore({
  reducer: { poll: slice.reducer },
  middleware: (g) => g().prepend(listenerMiddleware.middleware),
})

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог fork / cancel')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

// Храним родительский effect в closure, чтобы cancel работал извне
let tickTask: ForkedTask<unknown> | null = null
let heartbeatTask: ForkedTask<unknown> | null = null

// ── listener pollStart ───────────────────────────────────────────────
listenerMiddleware.startListening({
  actionCreator: pollStart,
  effect: async (_a, api) => {
    // takeLatest: повторный Start убьёт предыдущий effect
    api.cancelActiveListeners()
    con.info('[parent] effect start')
    setStatus('tick', 'on')
    setStatus('hb', 'on')

    // ── fork #1: tick each 1s ──────────────────────────────────────
    const t1 = api.fork(async (forkApi) => {
      let n = 0
      try {
        while (true) {
          await forkApi.delay(1000) // abort-aware
          n += 1
          api.dispatch(tick())
          con.log(`[fork tick] #${n}`)
        }
      } finally {
        con.warn(`[fork tick] finally — cleanup (n=${n}, aborted=${forkApi.signal.aborted})`)
        setStatus('tick', forkApi.signal.aborted ? 'cancelled' : 'off')
      }
    })
    tickTask = t1

    // ── fork #2: heartbeat each 2s ─────────────────────────────────
    const t2 = api.fork(async (forkApi) => {
      let n = 0
      try {
        while (true) {
          await forkApi.delay(2000)
          n += 1
          api.dispatch(heartbeat())
          con.log(`[fork heartbeat] #${n}`)
        }
      } finally {
        con.warn(`[fork heartbeat] finally — cleanup (n=${n}, aborted=${forkApi.signal.aborted})`)
        setStatus('hb', forkApi.signal.aborted ? 'cancelled' : 'off')
      }
    })
    heartbeatTask = t2

    // Парковаться на одном из них (любом). Без этого effect улетит мгновенно
    // и родительский abort уронит оба fork'а. Но здесь мы хотим, чтобы они жили.
    // Вариант 1 (использую здесь): ждать pollStop через api.take — это держит effect живым.
    const result = await api.take(pollStop.match)
    con.info(`[parent] got pollStop (action=${(result as Awaited<typeof result>)?.[0].type ?? '—'}), cancelling forks`)

    t1.cancel()
    t2.cancel()
    // Даём finally-блокам child'ов выполниться
    await Promise.allSettled([t1.result, t2.result])
    con.success('[parent] effect done — оба fork\'а завершились')
  },
})

// ── render ───────────────────────────────────────────────────────────
const ticksEl = document.getElementById('ticks')!
const hbEl = document.getElementById('hb')!
function render(): void {
  const s = store.getState().poll
  ticksEl.textContent = String(s.ticks)
  hbEl.textContent = String(s.heartbeats)
}
render()
store.subscribe(render)

function setStatus(which: 'tick' | 'hb', value: 'on' | 'off' | 'cancelled'): void {
  const el = document.getElementById(`status-${which}`)!
  el.className = `poll-box__status ${value}`
  el.textContent = value
}

// ── buttons ──────────────────────────────────────────────────────────
document.getElementById('start')!.addEventListener('click', () => {
  const a = pollStart(); store.dispatch(a); con.action(a)
})
document.getElementById('stop')!.addEventListener('click', () => {
  const a = pollStop(); store.dispatch(a); con.action(a)
})
document.getElementById('reset')!.addEventListener('click', () => {
  // Прямой cancel на случай «повис»
  try { tickTask?.cancel() } catch { /* ignore */ }
  try { heartbeatTask?.cancel() } catch { /* ignore */ }
  const a = reset(); store.dispatch(a); con.action(a)
  setStatus('tick', 'off')
  setStatus('hb', 'off')
})

con.log('Start — parent effect форкает два child\'а (tick каждую секунду, heartbeat каждые 2с).')
con.info('Stop — parent получает pollStop через await api.take(pollStop.match), затем зовёт .cancel() на обоих fork\'ах.')
con.warn('Обратите внимание: cleanup в finally-блоках child\'ов всегда срабатывает — TaskAbortError не проглатывается.')
