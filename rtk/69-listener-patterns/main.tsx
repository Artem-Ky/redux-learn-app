import {
  configureStore,
  createAction,
  createListenerMiddleware,
  createSlice,
  TaskAbortError,
  type PayloadAction,
  type UnsubscribeListener,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

type Mode = 'takeLatest' | 'takeEvery' | 'takeLeading' | 'throttle'

// ── slice с метриками ──────────────────────────────────────────────
interface BenchState {
  mode: Mode
  dispatched: number
  started: number
  done: number
  cancelled: number
}
const initial: BenchState = { mode: 'takeLatest', dispatched: 0, started: 0, done: 0, cancelled: 0 }

const slice = createSlice({
  name: 'bench',
  initialState: initial,
  reducers: {
    setMode: (s, a: PayloadAction<Mode>) => {
      s.mode = a.payload
      s.dispatched = 0; s.started = 0; s.done = 0; s.cancelled = 0
    },
    dispatched: (s) => { s.dispatched += 1 },
    effectStarted: (s) => { s.started += 1 },
    effectDone: (s) => { s.done += 1 },
    effectCancelled: (s) => { s.cancelled += 1 },
    reset: (s) => { s.dispatched = 0; s.started = 0; s.done = 0; s.cancelled = 0 },
  },
})
const { setMode, dispatched, effectStarted, effectDone, effectCancelled, reset } = slice.actions

const ping = createAction<number>('bench/ping')

// ── listener middleware ──────────────────────────────────────────────
const listenerMiddleware = createListenerMiddleware()

const store = configureStore({
  reducer: { bench: slice.reducer },
  middleware: (g) => g().prepend(listenerMiddleware.middleware),
})

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог саг-паттернов')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

// ── Переключатель — привязка одного из 4 listener'ов ────────────────
let unsubscribeCurrent: UnsubscribeListener | null = null

function installListener(mode: Mode): void {
  if (unsubscribeCurrent) {
    unsubscribeCurrent({ cancelActive: true })
    unsubscribeCurrent = null
  }

  if (mode === 'takeEvery') {
    unsubscribeCurrent = listenerMiddleware.startListening({
      actionCreator: ping,
      effect: async (action, api) => {
        api.dispatch(effectStarted())
        try {
          await api.delay(150)
          api.dispatch(effectDone())
          con.success(`[takeEvery] done for ping#${action.payload}`)
        } catch (e) {
          if (e instanceof TaskAbortError) {
            api.dispatch(effectCancelled())
            con.warn(`[takeEvery] cancelled ping#${action.payload} (${e.message})`)
          } else throw e
        }
      },
    })
    con.info('[install] takeEvery — все копии отработают параллельно')
    return
  }

  if (mode === 'takeLatest') {
    unsubscribeCurrent = listenerMiddleware.startListening({
      actionCreator: ping,
      effect: async (action, api) => {
        api.cancelActiveListeners()
        api.dispatch(effectStarted())
        try {
          await api.delay(150)
          api.dispatch(effectDone())
          con.success(`[takeLatest] done for ping#${action.payload}`)
        } catch (e) {
          if (e instanceof TaskAbortError) {
            api.dispatch(effectCancelled())
            con.warn(`[takeLatest] cancelled ping#${action.payload}`)
          } else throw e
        }
      },
    })
    con.info('[install] takeLatest — cancelActiveListeners + delay, живёт последний')
    return
  }

  if (mode === 'takeLeading') {
    unsubscribeCurrent = listenerMiddleware.startListening({
      actionCreator: ping,
      effect: async (action, api) => {
        api.dispatch(effectStarted())
        api.unsubscribe()
        try {
          await api.delay(400)
          api.dispatch(effectDone())
          con.success(`[takeLeading] done for ping#${action.payload}`)
        } catch (e) {
          if (e instanceof TaskAbortError) {
            api.dispatch(effectCancelled())
            con.warn('[takeLeading] cancelled')
          } else throw e
        } finally {
          api.subscribe()
        }
      },
    })
    con.info('[install] takeLeading — unsubscribe/subscribe, работа сзади')
    return
  }

  // throttle
  unsubscribeCurrent = listenerMiddleware.startListening({
    actionCreator: ping,
    effect: async (action, api) => {
      api.unsubscribe()
      api.dispatch(effectStarted())
      api.dispatch(effectDone()) // leading — работа выполняется сразу
      con.success(`[throttle] done for ping#${action.payload} (leading)`)
      try {
        await api.delay(400)
      } catch (e) {
        if (e instanceof TaskAbortError) con.warn('[throttle] window cancelled')
      } finally {
        api.subscribe()
        con.log('[throttle] window closed, subscribed back')
      }
    },
  })
  con.info('[install] throttle — работа в начале окна, затем 400мс unsubscribed')
}

installListener('takeLatest')

// ── render ───────────────────────────────────────────────────────────
function render(): void {
  const s = store.getState().bench
  document.getElementById('v-dispatch')!.textContent = String(s.dispatched)
  document.getElementById('v-started')!.textContent = String(s.started)
  document.getElementById('v-done')!.textContent = String(s.done)
  document.getElementById('v-cancelled')!.textContent = String(s.cancelled)
}
render()
store.subscribe(render)

// ── tab switch ───────────────────────────────────────────────────────
document.querySelectorAll<HTMLButtonElement>('.tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.tab as Mode
    document.querySelectorAll('.tab').forEach((b) => b.classList.remove('active'))
    btn.classList.add('active')
    document.querySelectorAll<HTMLElement>('.tab-panel').forEach((p) => {
      p.classList.toggle('active', p.dataset.panel === mode)
    })
    store.dispatch(setMode(mode))
    installListener(mode)
    con.log(`=== mode: ${mode} ===`)
  })
})

// ── spam ─────────────────────────────────────────────────────────────
let pingCounter = 0
document.getElementById('spam')!.addEventListener('click', () => {
  con.log('>>> spam: 10 × ping каждые 50мс')
  for (let i = 0; i < 10; i++) {
    setTimeout(() => {
      pingCounter += 1
      const a = ping(pingCounter)
      store.dispatch(a)
      store.dispatch(dispatched())
    }, i * 50)
  }
})

document.getElementById('single')!.addEventListener('click', () => {
  pingCounter += 1
  const a = ping(pingCounter)
  store.dispatch(a)
  store.dispatch(dispatched())
  con.action(a)
})

document.getElementById('reset')!.addEventListener('click', () => {
  store.dispatch(reset())
  con.log('счётчики сброшены')
})

con.log('Выберите режим, нажмите Spam — сравните 4 стратегии на одной и той же нагрузке.')
con.info('takeLatest: 10 started, 1 done, 9 cancelled | takeEvery: 10 / 10 / 0 | takeLeading/throttle: 1 / 1 / 0.')
