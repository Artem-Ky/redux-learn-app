import { configureStore, createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface BigData { size: number; items: number[] }

// Симулируем долгую загрузку, и САМОСТОЯТЕЛЬНО слушаем signal
function fakeLongFetch(signal: AbortSignal, ms = 2000): Promise<BigData> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const timer = setTimeout(() => {
      resolve({ size: 2048, items: Array.from({ length: 10 }, (_, i) => i + 1) })
    }, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }, { once: true })
  })
}

const fetchBig = createAsyncThunk<BigData, void>(
  'big/fetch',
  async (_arg, thunkAPI) => {
    return await fakeLongFetch(thunkAPI.signal, 2000)
  },
)

interface State {
  loading: 'idle' | 'pending'
  data: BigData | null
  lastStatus: string
  aborted: boolean
  error: string | null
}

const initial: State = {
  loading: 'idle',
  data: null,
  lastStatus: 'idle',
  aborted: false,
  error: null,
}

const slice = createSlice({
  name: 'big',
  initialState: initial,
  reducers: {
    reset: () => initial,
  },
  extraReducers: (b) => {
    b.addCase(fetchBig.pending, (s) => {
      s.loading = 'pending'
      s.lastStatus = 'pending'
      s.aborted = false
      s.error = null
      s.data = null
    })
    b.addCase(fetchBig.fulfilled, (s, a) => {
      s.loading = 'idle'
      s.lastStatus = 'fulfilled'
      s.data = a.payload
    })
    b.addCase(fetchBig.rejected, (s, a) => {
      s.loading = 'idle'
      s.aborted = !!a.meta.aborted
      s.lastStatus = a.meta.aborted ? 'rejected (aborted)' : 'rejected'
      s.error = a.error.message ?? 'unknown'
    })
  },
})

const store = configureStore({ reducer: slice.reducer })

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог cancellation')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const stateOut = document.getElementById('state-out')!
const timeline = document.getElementById('timeline')!

function tl(cls: 'pending' | 'ok' | 'err' | 'abort' | 'info', msg: string): void {
  const row = document.createElement('div')
  row.className = 'tl-row'
  const time = new Date().toLocaleTimeString('ru-RU', { hour12: false })
  row.innerHTML = `<span class="tl-time">${time}</span><span class="tl-${cls}">${msg}</span>`
  if (timeline.textContent === '—') timeline.innerHTML = ''
  timeline.appendChild(row)
  timeline.scrollTop = timeline.scrollHeight
}

function render(): void {
  stateOut.textContent = JSON.stringify(store.getState(), null, 2)
}
render()
store.subscribe(render)

// Лог actions
const origDispatch = store.dispatch
;(store as { dispatch: typeof origDispatch }).dispatch = ((a: unknown) => {
  const res = origDispatch(a as Parameters<typeof origDispatch>[0])
  const action = a as { type?: string; meta?: { aborted?: boolean; requestId?: string }; error?: { name?: string; message?: string } }
  if (typeof a !== 'function' && action.type) {
    con.action({ type: action.type })
    if (action.type.endsWith('/pending')) tl('pending', `pending (requestId=${action.meta?.requestId?.slice(0, 6)}…)`)
    if (action.type.endsWith('/fulfilled')) tl('ok', `fulfilled`)
    if (action.type.endsWith('/rejected')) {
      if (action.meta?.aborted) tl('abort', `rejected (aborted) — error.name=${action.error?.name}`)
      else tl('err', `rejected — ${action.error?.message}`)
    }
  }
  return res
}) as typeof origDispatch

// ── Способ 1: promise.abort() ────────────────────────────────
type ThunkPromise = ReturnType<typeof fetchBig> extends (...args: unknown[]) => infer R ? R : never
let currentPromise: ReturnType<ReturnType<typeof fetchBig>> | null = null

const startBtn = document.getElementById('start') as HTMLButtonElement
const cancelBtn = document.getElementById('cancel') as HTMLButtonElement

startBtn.addEventListener('click', () => {
  con.log('>>> dispatch(fetchBig()) — через 2 секунды resolve, или прервите.')
  currentPromise = store.dispatch(fetchBig())
  cancelBtn.disabled = false
  startBtn.disabled = true
  currentPromise.finally(() => {
    cancelBtn.disabled = true
    startBtn.disabled = false
    currentPromise = null
  })
})

cancelBtn.addEventListener('click', () => {
  if (currentPromise) {
    con.warn('>>> promise.abort("user clicked Cancel")')
    currentPromise.abort('user clicked Cancel')
  }
})

// ── Способ 2: external AbortController ────────────────────────
let externalController: AbortController | null = null

const extStartBtn = document.getElementById('start-external') as HTMLButtonElement
const extCancelBtn = document.getElementById('cancel-external') as HTMLButtonElement

extStartBtn.addEventListener('click', () => {
  externalController = new AbortController()
  con.log('>>> dispatch(fetchBig(undefined, { signal: externalController.signal }))')
  const p = store.dispatch(fetchBig(undefined, { signal: externalController.signal }))
  extCancelBtn.disabled = false
  extStartBtn.disabled = true
  p.finally(() => {
    extCancelBtn.disabled = true
    extStartBtn.disabled = false
    externalController = null
  })
})

extCancelBtn.addEventListener('click', () => {
  if (externalController) {
    con.warn('>>> externalController.abort() — RTK получит abort через "abort" listener')
    externalController.abort()
  }
})

// ── Очистка timeline ─────────────────────────────────────────
document.getElementById('clear-tl')!.addEventListener('click', () => {
  timeline.innerHTML = '—'
  store.dispatch(slice.actions.reset())
})

con.log('fetchBig — thunk с симуляцией 2-секундного fetch\'а, ЛИЧНО слушает thunkAPI.signal.')
con.info('Способ 1: promise = dispatch(fetchBig()); promise.abort()')
con.info('Способ 2: dispatch(fetchBig(arg, { signal: externalController.signal }))')
con.info('В rejected: action.meta.aborted === true, action.error.name === "AbortError"')
con.success('Попробуйте abort ПОСЛЕ fulfilled — увидите, что ничего не происходит (race выиграл payload).')
