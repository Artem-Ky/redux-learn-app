import {
  configureStore,
  createAsyncThunk,
  createSlice,
  type Action,
  type ThunkAction,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── Общий мок-API (симуляция сети, не реальный fetch) ─────────────
interface User { id: number; name: string }

function fakeFetchUsers(failRate = 0.3): Promise<User[]> {
  const delay = 400 + Math.floor(Math.random() * 700)
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < failRate) reject(new Error(`Network 500 (после ${delay}ms)`))
      else resolve([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      ])
    }, delay)
  })
}

/* ════════════════════════════════════════════════════════════
   1) РУЧНОЙ THUNK — 3 action creators + switch reducer
   ════════════════════════════════════════════════════════════ */
interface ManualState { loading: boolean; list: User[]; error: string | null }
const manualInit: ManualState = { loading: false, list: [], error: null }

const M_PENDING = 'users/pending' as const
const M_OK      = 'users/fulfilled' as const
const M_FAIL    = 'users/rejected' as const

interface ManualPending   { type: typeof M_PENDING }
interface ManualOk        { type: typeof M_OK; payload: User[] }
interface ManualFail      { type: typeof M_FAIL; error: string }
type ManualAction = ManualPending | ManualOk | ManualFail

const manualPending   = (): ManualPending => ({ type: M_PENDING })
const manualFulfilled = (u: User[]): ManualOk => ({ type: M_OK, payload: u })
const manualRejected  = (e: string): ManualFail => ({ type: M_FAIL, error: e })

const fetchUsersManual =
  (): ThunkAction<Promise<void>, ManualState, unknown, Action> =>
  async (dispatch) => {
    dispatch(manualPending())
    try {
      const users = await fakeFetchUsers()
      dispatch(manualFulfilled(users))
    } catch (e) {
      dispatch(manualRejected((e as Error).message))
    }
  }

function manualReducer(state: ManualState = manualInit, action: ManualAction | Action): ManualState {
  switch ((action as ManualAction).type) {
    case M_PENDING: return { ...state, loading: true, error: null }
    case M_OK:      return { ...state, loading: false, list: (action as ManualOk).payload, error: null }
    case M_FAIL:    return { ...state, loading: false, error: (action as ManualFail).error }
    default: return state
  }
}

const manualStore = configureStore({ reducer: manualReducer, devTools: false })

/* ════════════════════════════════════════════════════════════
   2) RTK — createAsyncThunk + extraReducers
   ════════════════════════════════════════════════════════════ */
const fetchUsersRTK = createAsyncThunk<User[]>(
  'users/fetch',
  async () => fakeFetchUsers(),
)

const rtkSlice = createSlice({
  name: 'users',
  initialState: { loading: false, list: [] as User[], error: null as string | null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchUsersRTK.pending,   (s) => { s.loading = true;  s.error = null })
    b.addCase(fetchUsersRTK.fulfilled, (s, a) => { s.loading = false; s.list = a.payload })
    b.addCase(fetchUsersRTK.rejected,  (s, a) => { s.loading = false; s.error = a.error.message ?? 'unknown' })
  },
})

const rtkStore = configureStore({ reducer: rtkSlice.reducer, devTools: false })

/* ════════════════════════════════════════════════════════════
   UI
   ════════════════════════════════════════════════════════════ */
const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог обоих store (L=ручной, R=RTK)')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
// DevTools подключаем к RTK-store (у него интересные meta); ручной просто в console-panel
dev.connectStore(rtkStore)

const manualEl = document.getElementById('manual-state')!
const rtkEl    = document.getElementById('rtk-state')!

function render(): void {
  manualEl.textContent = JSON.stringify(manualStore.getState(), null, 2)
  rtkEl.textContent    = JSON.stringify(rtkStore.getState(),    null, 2)
}
render()
manualStore.subscribe(render)
rtkStore.subscribe(render)

// Лог actions в консоли — для обоих store одинаково
const origManualDispatch = manualStore.dispatch
manualStore.dispatch = ((a: Action | ThunkAction<unknown, ManualState, unknown, Action>) => {
  if (typeof a !== 'function') con.action({ type: `[L] ${(a as Action).type}` })
  return origManualDispatch(a as Action)
}) as typeof manualStore.dispatch

const origRtkDispatch = rtkStore.dispatch
rtkStore.dispatch = ((a: Action | ThunkAction<unknown, ReturnType<typeof rtkStore.getState>, unknown, Action>) => {
  if (typeof a !== 'function') con.action({ type: `[R] ${(a as Action).type}` })
  return origRtkDispatch(a as Action)
}) as typeof rtkStore.dispatch

document.getElementById('fetch-both')!.addEventListener('click', () => {
  con.info('── Параллельный запуск обоих thunk\'ов (random delay, 30% fail) ──')
  manualStore.dispatch(fetchUsersManual())
  rtkStore.dispatch(fetchUsersRTK())
})

document.getElementById('reset-both')!.addEventListener('click', () => {
  manualStore.dispatch({ type: '@@RESET' })
  rtkStore.dispatch({ type: '@@RESET' })
  con.log('— сброс обоих store —')
})

con.log('Слева — ручной thunk (≈40 строк: action types, creators, reducer switch).')
con.log('Справа — RTK createAsyncThunk (≈12 строк, типы и meta бесплатно).')
con.success('DevTools выше — подключён к правому (RTK) store: видно полный meta c arg/requestId/requestStatus.')
