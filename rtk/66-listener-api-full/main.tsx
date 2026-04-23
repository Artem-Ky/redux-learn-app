import {
  configureStore,
  createAction,
  createListenerMiddleware,
  createSlice,
  TaskAbortError,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── slice ────────────────────────────────────────────────────────────
interface DemoState {
  value: number
  extHits: number
  lastEcho: string | null
  takeLatestRun: number
}
const initial: DemoState = { value: 0, extHits: 0, lastEcho: null, takeLatestRun: 0 }

const slice = createSlice({
  name: 'demo',
  initialState: initial,
  reducers: {
    bumpValue: (s) => { s.value += 1 },
    echo: (s, a: PayloadAction<string>) => { s.lastEcho = a.payload },
    extBump: (s) => { s.extHits += 1 },
    runStart: (s) => { s.takeLatestRun += 1 },
    reset: () => initial,
  },
})
const { bumpValue, echo, extBump, runStart, reset } = slice.actions

// Actions-триггеры — по одному на команду
const cmdGetState = createAction('cmd/getState')
const cmdGetOriginal = createAction('cmd/getOriginal')
const cmdDispatch = createAction('cmd/dispatch')
const cmdCancelActive = createAction('cmd/cancelActive')
const cmdPause = createAction('cmd/pause')
const cmdDelay = createAction('cmd/delay')
const cmdUnsubSub = createAction('cmd/unsubSub')
const cmdTake = createAction('cmd/take')
const cmdCondition = createAction('cmd/condition')

// Действие, которого ждут take/condition
const wakeUp = createAction<string>('signal/wakeUp')

// ── listener middleware ──────────────────────────────────────────────
const listenerMiddleware = createListenerMiddleware({
  // Передаём extra — чтобы показать listenerApi.extra
  extra: { env: 'demo', now: () => new Date().toLocaleTimeString('ru-RU', { hour12: false }) },
})

const store = configureStore({
  reducer: { demo: slice.reducer },
  middleware: (g) => g().prepend(listenerMiddleware.middleware),
})
type RootState = ReturnType<typeof store.getState>

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог listenerApi')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

// ── 1. getState ──────────────────────────────────────────────────────
listenerMiddleware.startListening({
  actionCreator: cmdGetState,
  effect: (_a, api) => {
    const s = api.getState() as RootState
    con.info(`[getState] state.demo.value = ${s.demo.value}`)
  },
})

// ── 2. getOriginalState ──────────────────────────────────────────────
listenerMiddleware.startListening({
  actionCreator: bumpValue,
  effect: async (_a, api) => {
    const cur = api.getState() as RootState
    const before = api.getOriginalState() as RootState
    con.info(`[getOriginalState] BEFORE value=${before.demo.value} | AFTER value=${cur.demo.value}`)
    try {
      await api.delay(50)
      // Теперь sync-ветка закрыта — следующий вызов уронит эффект.
      api.getOriginalState()
    } catch (e) {
      con.error(`[getOriginalState] после await → ${(e as Error).message}`)
    }
  },
})

// ── 3. dispatch изнутри effect ───────────────────────────────────────
listenerMiddleware.startListening({
  actionCreator: cmdDispatch,
  effect: (_a, api) => {
    con.log('[dispatch] диспатчим 3 action\'а echo(...)')
    api.dispatch(echo('alpha'))
    api.dispatch(echo('beta'))
    api.dispatch(echo('gamma'))
    con.success(`[dispatch] lastEcho = ${(api.getState() as RootState).demo.lastEcho}`)
  },
})

// ── 4. cancelActiveListeners (takeLatest) ────────────────────────────
listenerMiddleware.startListening({
  actionCreator: cmdCancelActive,
  effect: async (_a, api) => {
    const id = Math.floor(Math.random() * 1000)
    con.info(`[takeLatest #${id}] start`)
    api.cancelActiveListeners() // кладём предыдущих
    api.dispatch(runStart())
    try {
      await api.delay(700)
      con.success(`[takeLatest #${id}] finished — только последний доходит сюда`)
    } catch (e) {
      if (e instanceof TaskAbortError) con.warn(`[takeLatest #${id}] ${e.message}`)
      else throw e
    }
  },
})

// ── 5. pause(promise) ────────────────────────────────────────────────
listenerMiddleware.startListening({
  actionCreator: cmdPause,
  effect: async (_a, api) => {
    con.log('[pause] стартуем await pause(fetch-like promise)')
    const fake = new Promise<string>((r) => setTimeout(() => r('external-result'), 400))
    try {
      const res = await api.pause(fake)
      con.success(`[pause] результат: ${res}`)
    } catch (e) {
      if (e instanceof TaskAbortError) con.warn(`[pause] ${e.message}`)
    }
  },
})

// ── 6. delay(ms) ─────────────────────────────────────────────────────
listenerMiddleware.startListening({
  actionCreator: cmdDelay,
  effect: async (_a, api) => {
    con.log('[delay] жду 300мс (abort-aware)')
    try {
      await api.delay(300)
      con.success('[delay] ок, 300мс прошло')
    } catch (e) {
      if (e instanceof TaskAbortError) con.warn(`[delay] ${e.message}`)
    }
  },
})

// ── 7. unsubscribe / subscribe ───────────────────────────────────────
listenerMiddleware.startListening({
  actionCreator: cmdUnsubSub,
  effect: async (_a, api) => {
    con.info('[unsub] снимаю listener, слежу за ext-action\'ами')
    api.unsubscribe()
    api.dispatch(extBump()) // сам себе
    con.log('[unsub] жду 400мс…')
    await api.delay(400)
    api.subscribe()
    con.success('[sub] снова подписан — следующий cmdUnsubSub сработает')
  },
})

// Отдельный listener на extBump — чтобы видеть, что unsubscribe касается ТОЛЬКО моего entry
listenerMiddleware.startListening({
  actionCreator: extBump,
  effect: (_a, api) => {
    const s = api.getState() as RootState
    con.action({ type: 'demo/extBump' }, `extHits=${s.demo.extHits}`)
  },
})

// ── 8. take(predicate, timeout?) ─────────────────────────────────────
listenerMiddleware.startListening({
  actionCreator: cmdTake,
  effect: async (_a, api) => {
    con.info('[take] ждём wakeUp (таймаут 2000мс). Диспатчите wakeUp через кнопку «dispatch»-cmd-«take + wakeUp».')
    const result = await api.take(wakeUp.match, 2000)
    if (result === null) {
      con.warn('[take] таймаут, wakeUp не пришёл')
      return
    }
    const [action] = result
    con.success(`[take] получено wakeUp с payload="${(action as ReturnType<typeof wakeUp>).payload}"`)
  },
})

// ── 9. condition(predicate) ──────────────────────────────────────────
listenerMiddleware.startListening({
  actionCreator: cmdCondition,
  effect: async (_a, api) => {
    con.info('[condition] жду, когда value >= 3 (таймаут 5с). Нажмите «getState» несколько раз — value не меняется. Нужен bumpValue.')
    const ok = await api.condition(
      (_act, cur) => (cur as RootState).demo.value >= 3,
      5000,
    )
    con.success(`[condition] результат = ${ok} (state.value = ${(api.getState() as RootState).demo.value})`)
  },
})

// ── render ───────────────────────────────────────────────────────────
const stateOut = document.getElementById('state-out')!
function render(): void {
  stateOut.textContent = JSON.stringify(store.getState().demo, null, 2)
}
render()
store.subscribe(render)

// ── command mapping ──────────────────────────────────────────────────
const CMD_ACTIONS: Record<string, () => { type: string; payload?: unknown }> = {
  'get-state': () => cmdGetState(),
  'get-original': () => bumpValue(),
  dispatch: () => cmdDispatch(),
  'cancel-active': () => cmdCancelActive(),
  pause: () => cmdPause(),
  delay: () => cmdDelay(),
  'unsub-sub': () => cmdUnsubSub(),
  take: () => cmdTake(),
  condition: () => cmdCondition(),
}

document.querySelectorAll<HTMLButtonElement>('.api-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const cmd = btn.dataset.cmd!
    const a = CMD_ACTIONS[cmd]()
    store.dispatch(a)
    con.action(a)
    if (cmd === 'take') {
      // Через секунду отправим wakeUp — чтобы take его поймал
      setTimeout(() => {
        const w = wakeUp('hello-from-setTimeout')
        store.dispatch(w)
        con.action(w, 'auto-wakeUp')
      }, 800)
    }
  })
})

document.getElementById('reset')!.addEventListener('click', () => {
  const a = reset(); store.dispatch(a); con.action(a)
})

con.log('listenerApi = { dispatch, getState, getOriginalState, take, condition, pause, delay, fork, signal, extra, subscribe, unsubscribe, cancelActiveListeners, cancel, throwIfCancelled }')
con.info('Подсказка: «cancelActiveListeners» — кликайте быстро подряд чтобы увидеть takeLatest-эффект.')
