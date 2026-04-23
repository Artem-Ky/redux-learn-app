import { configureStore, createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface DataResult { value: string; rows: number }
interface FetchError { code: number; message: string }

// Мок-сеть
function fakeApi(arg: 'ok' | 'fail'): Promise<DataResult> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (arg === 'fail') reject(new Error('HTTP 503 Service Unavailable'))
      else resolve({ value: `data-${arg}`, rows: 42 })
    }, 500)
  })
}

// Typed thunk с ПОЛНЫМ ThunkApiConfig
const fetchData = createAsyncThunk<
  DataResult,
  'ok' | 'fail',
  {
    pendingMeta:   { startedAt: number; client: string }
    fulfilledMeta: { server: string; cached: boolean; durationMs: number }
    rejectedMeta:  { retryable: boolean }
    rejectValue:   FetchError
  }
>(
  'data/fetch',
  async (arg, { fulfillWithValue, rejectWithValue, requestId }) => {
    const started = Date.now()
    try {
      const data = await fakeApi(arg)
      return fulfillWithValue(data, {
        server: 'eu-west-1',
        cached: false,
        durationMs: Date.now() - started,
      })
    } catch (e) {
      const err = e as Error
      return rejectWithValue(
        { code: 503, message: err.message },
        { retryable: true },
      )
    }
    void requestId
  },
  {
    // Эта функция вызывается ДО dispatch(pending)
    getPendingMeta: (base, _api) => ({
      startedAt: Date.now(),
      client: `browser-${base.requestId.slice(0, 4)}`,
    }),
    // Фиксированный id, чтобы видеть его в логе
    idGenerator: (arg) => `req-${arg}-${Math.floor(Math.random() * 1_000_000).toString(36)}`,
  },
)

interface State {
  lastAction: unknown
  lastData: DataResult | null
  lastError: FetchError | null
  history: { type: string; at: number; startedAt?: number; server?: string; retryable?: boolean }[]
}

const initial: State = {
  lastAction: null,
  lastData: null,
  lastError: null,
  history: [],
}

const slice = createSlice({
  name: 'data',
  initialState: initial,
  reducers: {
    clear: () => initial,
  },
  extraReducers: (b) => {
    b.addCase(fetchData.pending, (s, a) => {
      s.lastAction = { type: a.type, meta: a.meta }
      s.history.push({
        type: a.type,
        at: Date.now(),
        startedAt: a.meta.startedAt,  // типизировано!
      })
    })
    b.addCase(fetchData.fulfilled, (s, a) => {
      s.lastAction = { type: a.type, payload: a.payload, meta: a.meta }
      s.lastData = a.payload
      s.history.push({
        type: a.type,
        at: Date.now(),
        server: a.meta.server,
      })
    })
    b.addCase(fetchData.rejected, (s, a) => {
      s.lastAction = { type: a.type, payload: a.payload, error: a.error, meta: a.meta }
      s.lastError = a.payload ?? { code: -1, message: a.error.message ?? 'unknown' }
      s.history.push({
        type: a.type,
        at: Date.now(),
        retryable: a.meta.rejectedWithValue ? a.meta.retryable : undefined,
      })
    })
  },
})

const store = configureStore({ reducer: slice.reducer })

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог custom meta')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const stateOut   = document.getElementById('state-out')!
const actionDump = document.getElementById('action-dump')!

function prettyMeta(obj: unknown): string {
  return JSON.stringify(obj, null, 2)
    .replace(/"([^"]+)":/g, '<span class="meta-key">"$1"</span>:')
    .replace(/: ("[^"]*"|\d+|true|false|null)/g, ': <span class="meta-val">$1</span>')
}

function render(): void {
  const s = store.getState()
  stateOut.textContent = JSON.stringify(s, null, 2)
  if (s.lastAction) actionDump.innerHTML = prettyMeta(s.lastAction)
}
render()
store.subscribe(render)

// dispatch лог
const origDispatch = store.dispatch
;(store as { dispatch: typeof origDispatch }).dispatch = ((a: unknown) => {
  const res = origDispatch(a as Parameters<typeof origDispatch>[0])
  const act = a as { type?: string; meta?: Record<string, unknown> }
  if (typeof a !== 'function' && act.type) {
    con.action({ type: act.type })
    if (act.meta) con.info('  meta:', act.meta)
  }
  return res
}) as typeof origDispatch

document.getElementById('fetch-ok')!.addEventListener('click', () => {
  store.dispatch(fetchData('ok'))
})
document.getElementById('fetch-fail')!.addEventListener('click', () => {
  store.dispatch(fetchData('fail'))
})
document.getElementById('fetch-both')!.addEventListener('click', async () => {
  con.info('── Два запроса подряд — видим durationMs + разные requestId ──')
  store.dispatch(fetchData('ok'))
  await new Promise(r => setTimeout(r, 100))
  store.dispatch(fetchData('fail'))
})

con.log('Thunk = createAsyncThunk<Returned, ThunkArg, ThunkApiConfig>')
con.log('ThunkApiConfig: { pendingMeta, fulfilledMeta, rejectedMeta, rejectValue }')
con.info('getPendingMeta({arg,requestId}, {getState,extra}) — обязательный в TS, если pendingMeta объявлен')
con.info('fulfillWithValue(payload, meta) — меты попадают в fulfilled.action.meta')
con.info('rejectWithValue(payload, meta) — меты попадают в rejected.action.meta')
con.success('idGenerator: стабильный requestId для arg. Вызывается ДО condition — никогда не кладите тяжёлую логику.')
