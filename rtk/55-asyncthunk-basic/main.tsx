import { configureStore, createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface User { id: number; name: string; email: string }

// Симулируем сеть setTimeout + Promise, не реальный fetch
function fakeFetchUser(id: number, signal?: AbortSignal): Promise<User> {
  const delay = 500 + Math.floor(Math.random() * 400)
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (id === 404) return reject(new Error(`User ${id} not found (HTTP 404)`))
      if (id < 1)     return reject(new Error(`Invalid id ${id}`))
      resolve({ id, name: `User #${id}`, email: `user${id}@example.com` })
    }, delay)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })
}

// ── Первый createAsyncThunk ──────────────────────────────────
const fetchUserById = createAsyncThunk<User, number>(
  'users/fetchById',
  async (id, thunkAPI) => {
    // thunkAPI.signal автоматически пробрасываем в fetch
    return await fakeFetchUser(id, thunkAPI.signal)
  },
)

interface UsersState {
  loading: 'idle' | 'pending'
  entity: User | null
  error: string | null
  lastRequestId: string | null
}

const initialState: UsersState = {
  loading: 'idle',
  entity: null,
  error: null,
  lastRequestId: null,
}

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    reset: () => initialState,
  },
  extraReducers: (b) => {
    b.addCase(fetchUserById.pending, (s, a) => {
      s.loading = 'pending'
      s.error = null
      s.lastRequestId = a.meta.requestId
    })
    b.addCase(fetchUserById.fulfilled, (s, a) => {
      s.loading = 'idle'
      s.entity = a.payload
    })
    b.addCase(fetchUserById.rejected, (s, a) => {
      s.loading = 'idle'
      s.error = a.error.message ?? 'Unknown error'
    })
  },
})

const store = configureStore({ reducer: usersSlice.reducer })
type RootState = ReturnType<typeof store.getState>
type AppDispatch = typeof store.dispatch

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог action lifecycle')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const stateOut = document.getElementById('state-out')!
const lcIdle    = document.getElementById('lc-idle')!
const lcPending = document.getElementById('lc-pending')!
const lcOk      = document.getElementById('lc-ok')!
const lcErr     = document.getElementById('lc-err')!

function render(): void {
  const s: RootState = store.getState()
  stateOut.textContent = JSON.stringify(s, null, 2)

  // Подсветка состояния
  lcIdle.classList.toggle('on',  s.loading === 'idle' && !s.entity && !s.error)
  lcPending.classList.toggle('on', s.loading === 'pending')
  lcOk.classList.toggle('ok',    s.loading === 'idle' && !!s.entity && !s.error)
  lcErr.classList.toggle('err',  s.loading === 'idle' && !!s.error)
}
render()
store.subscribe(render)

// Перехват dispatch для подробного лога
const origDispatch = store.dispatch as AppDispatch
;(store as { dispatch: AppDispatch }).dispatch = ((a: unknown) => {
  const res = origDispatch(a as Parameters<AppDispatch>[0])
  if (typeof a !== 'function' && typeof (a as { type?: unknown }).type === 'string') {
    const action = a as { type: string; payload?: unknown; meta?: Record<string, unknown>; error?: unknown }
    con.action(action)
    if (action.meta) con.info('  meta:', action.meta)
    if (action.error) con.warn('  error:', action.error)
  }
  return res
}) as AppDispatch

document.getElementById('fetch-1')!.addEventListener('click', () => {
  con.log('>>> dispatch(fetchUserById(1))')
  store.dispatch(fetchUserById(1))
})

document.getElementById('fetch-2')!.addEventListener('click', () => {
  con.log('>>> dispatch(fetchUserById(2))')
  store.dispatch(fetchUserById(2))
})

document.getElementById('fetch-fail')!.addEventListener('click', () => {
  con.log('>>> dispatch(fetchUserById(404)) — специально ошибка')
  store.dispatch(fetchUserById(404))
})

document.getElementById('unwrap-demo')!.addEventListener('click', async () => {
  con.log('>>> dispatch + .unwrap() + try/catch')
  try {
    const user = await store.dispatch(fetchUserById(404)).unwrap()
    con.success(`unwrap() вернул payload: ${JSON.stringify(user)}`)
  } catch (err) {
    const e = err as { message?: string; name?: string }
    con.error(`unwrap() бросил ошибку: ${e.name ?? 'Error'} — ${e.message ?? 'unknown'}`)
    con.info('(без .unwrap() мы бы никогда не попали в catch — promise от thunk всегда fulfilled)')
  }
})

con.log('fetchUserById = createAsyncThunk(typePrefix, async (arg, thunkAPI) => …)')
con.log('Type prefix = "users/fetchById" → RTK создаёт 3 action creators:')
con.info('  fetchUserById.pending.type   === "users/fetchById/pending"')
con.info('  fetchUserById.fulfilled.type === "users/fetchById/fulfilled"')
con.info('  fetchUserById.rejected.type  === "users/fetchById/rejected"')
con.success('Нажмите "Fetch user #1" — в DevTools увидите pending → fulfilled с полным meta.')
