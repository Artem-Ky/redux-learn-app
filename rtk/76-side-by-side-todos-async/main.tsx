import {
  createStore, combineReducers, applyMiddleware,
  type Reducer, type Dispatch,
} from 'redux'
import {
  configureStore, createSlice, createAsyncThunk,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог трёх async-стратегий')

// ────────────────────────────────────────────────────────────────
// Mock API: возвращает todos через 800 мс; при simulateFail — Error
// ────────────────────────────────────────────────────────────────
interface Todo { id: number; text: string; done: boolean }
const MOCK_TODOS: Todo[] = [
  { id: 1, text: 'Learn RTK', done: true },
  { id: 2, text: 'Compare thunk vs asyncThunk', done: true },
  { id: 3, text: 'Try RTK Query', done: false },
  { id: 4, text: 'Ship a feature', done: false },
]

let simulateFail = false
document.getElementById('sim-fail')!.addEventListener('change', (e) => {
  simulateFail = (e.target as HTMLInputElement).checked
  con.warn(`simulateFail = ${simulateFail}`)
})

function mockFetchTodos(): Promise<Todo[]> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (simulateFail) reject(new Error('Network failure (simulated)'))
      else resolve(MOCK_TODOS)
    }, 800)
  })
}

// ────────────────────────────────────────────────────────────────
// 1) CLASSIC REDUX + manual thunk middleware
//    Три action types, switch в reducer, thunk-функция вручную
// ────────────────────────────────────────────────────────────────
interface ClassicTodosState {
  loading: boolean
  data: Todo[]
  error: string | null
}
const FETCH_START = 'todos/FETCH_START'
const FETCH_SUCCESS = 'todos/FETCH_SUCCESS'
const FETCH_FAIL = 'todos/FETCH_FAIL'
const CLEAR = 'todos/CLEAR'

interface ClassicTodoAction {
  type: string
  payload?: Todo[]
  error?: string
}

const classicTodosReducer: Reducer<ClassicTodosState, ClassicTodoAction> = (
  state = { loading: false, data: [], error: null },
  action,
) => {
  switch (action.type) {
    case FETCH_START:   return { loading: true, data: [], error: null }
    case FETCH_SUCCESS: return { loading: false, data: action.payload ?? [], error: null }
    case FETCH_FAIL:    return { loading: false, data: [], error: action.error ?? 'unknown' }
    case CLEAR:         return { loading: false, data: [], error: null }
    default:            return state
  }
}

// Минимальный redux-thunk middleware своими руками
type ThunkFn = (dispatch: Dispatch<ClassicTodoAction>) => void
const thunkMiddleware =
  () =>
  (next: Dispatch<ClassicTodoAction>) =>
  (action: ClassicTodoAction | ThunkFn) => {
    if (typeof action === 'function') return (action as ThunkFn)((a) => next(a))
    return next(action as ClassicTodoAction)
  }

const classicStore = createStore(
  combineReducers({ todos: classicTodosReducer }),
  // @ts-expect-error — минимальный thunk middleware без полной generic-обвязки
  applyMiddleware(thunkMiddleware),
)

function fetchTodosClassic() {
  return (dispatch: Dispatch<ClassicTodoAction>) => {
    dispatch({ type: FETCH_START })
    mockFetchTodos().then(
      (data) => dispatch({ type: FETCH_SUCCESS, payload: data }),
      (err: Error) => dispatch({ type: FETCH_FAIL, error: err.message }),
    )
  }
}

// ────────────────────────────────────────────────────────────────
// 2) RTK createAsyncThunk + extraReducers
// ────────────────────────────────────────────────────────────────
const fetchTodos = createAsyncThunk<Todo[]>(
  'todos/fetch',
  async (_, thunkAPI) => {
    try {
      return await mockFetchTodos()
    } catch (err) {
      return thunkAPI.rejectWithValue((err as Error).message)
    }
  },
)

interface RtkTodosState {
  loading: boolean
  data: Todo[]
  error: string | null
}
const todosSlice = createSlice({
  name: 'todos',
  initialState: { loading: false, data: [], error: null } as RtkTodosState,
  reducers: {
    clearTodos: () => ({ loading: false, data: [], error: null }),
  },
  extraReducers: (b) => {
    b.addCase(fetchTodos.pending, (s) => { s.loading = true; s.error = null })
    b.addCase(fetchTodos.fulfilled, (s, a: PayloadAction<Todo[]>) => { s.loading = false; s.data = a.payload })
    b.addCase(fetchTodos.rejected, (s, a) => {
      s.loading = false
      s.error = (a.payload as string) ?? a.error.message ?? 'unknown'
    })
  },
})
const { clearTodos } = todosSlice.actions
const rtkStore = configureStore({ reducer: { todos: todosSlice.reducer } })

// ────────────────────────────────────────────────────────────────
// 3) RTK QUERY — createApi с build.query
//    fetchFn возвращает фейковый Response
// ────────────────────────────────────────────────────────────────
async function mockFetchResponse(_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> {
  await new Promise((r) => setTimeout(r, 800))
  if (simulateFail) {
    return new Response(JSON.stringify({ error: 'Network failure (simulated)' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
  return new Response(JSON.stringify(MOCK_TODOS), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  })
}

const todosApi = createApi({
  reducerPath: 'todosApi',
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://mock.local',
    fetchFn: mockFetchResponse as typeof fetch,
  }),
  endpoints: (build) => ({
    getTodos: build.query<Todo[], void>({
      query: () => '/todos',
      keepUnusedDataFor: 30,
    }),
  }),
})

const rtkqStore = configureStore({
  reducer: { [todosApi.reducerPath]: todosApi.reducer },
  middleware: (g) => g().concat(todosApi.middleware),
})

// ────────────────────────────────────────────────────────────────
// DevTools — к RTK store (второй колонке)
// ────────────────────────────────────────────────────────────────
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(rtkStore)

// ────────────────────────────────────────────────────────────────
// Render helpers
// ────────────────────────────────────────────────────────────────
function setDot(id: string, status: 'idle' | 'loading' | 'success' | 'error'): void {
  const dot = document.getElementById(id)!
  dot.className = 'status-dot ' + status
}

function renderList(listEl: HTMLElement, state: { loading: boolean; data: Todo[]; error: string | null }): void {
  if (state.loading) {
    listEl.innerHTML = '<div class="todo-list__spinner">Loading…</div>'
    return
  }
  if (state.error) {
    listEl.innerHTML = `<div class="todo-list__error">error: ${escapeHtml(state.error)}</div>`
    return
  }
  if (state.data.length === 0) {
    listEl.innerHTML = '<div class="todo-list__empty">Нет данных — нажмите Fetch</div>'
    return
  }
  listEl.innerHTML = state.data.map((t) =>
    `<div class="todo-list__item ${t.done ? 'done' : ''}"><input type="checkbox" ${t.done ? 'checked' : ''} disabled>${escapeHtml(t.text)}</div>`,
  ).join('')
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Classic
const classicList = document.getElementById('classic-list')!
const classicStatus = document.getElementById('classic-status')!
const classicShape = document.getElementById('classic-shape')!

function renderClassic(): void {
  const s = (classicStore.getState() as { todos: ClassicTodosState }).todos
  classicStatus.textContent = s.loading ? 'loading' : s.error ? 'error' : s.data.length ? 'success' : 'idle'
  setDot('classic-dot', s.loading ? 'loading' : s.error ? 'error' : s.data.length ? 'success' : 'idle')
  renderList(classicList, s)
  classicShape.textContent = JSON.stringify({ loading: s.loading, data: `[${s.data.length}]`, error: s.error }, null, 2)
}
classicStore.subscribe(renderClassic)
renderClassic()

// RTK
const rtkList = document.getElementById('rtk-list')!
const rtkStatus = document.getElementById('rtk-status')!
const rtkShape = document.getElementById('rtk-shape')!

function renderRtk(): void {
  const s = rtkStore.getState().todos
  rtkStatus.textContent = s.loading ? 'loading' : s.error ? 'error' : s.data.length ? 'success' : 'idle'
  setDot('rtk-dot', s.loading ? 'loading' : s.error ? 'error' : s.data.length ? 'success' : 'idle')
  renderList(rtkList, s)
  rtkShape.textContent = JSON.stringify({ loading: s.loading, data: `[${s.data.length}]`, error: s.error }, null, 2)
}
rtkStore.subscribe(renderRtk)
renderRtk()

// RTK Query — подписка через endpoints.select
const rtkqList = document.getElementById('rtkq-list')!
const rtkqStatus = document.getElementById('rtkq-status')!
const rtkqShape = document.getElementById('rtkq-shape')!

function renderRtkq(): void {
  const selector = todosApi.endpoints.getTodos.select()
  const entry = selector(rtkqStore.getState())
  const status = entry.status
  rtkqStatus.textContent = status
  setDot(
    'rtkq-dot',
    status === 'pending' ? 'loading'
    : status === 'fulfilled' ? 'success'
    : status === 'rejected' ? 'error'
    : 'idle',
  )
  const data = (entry.data as Todo[] | undefined) ?? []
  const errorMsg = entry.error ? JSON.stringify(entry.error) : null
  renderList(rtkqList, {
    loading: status === 'pending' && data.length === 0,
    data,
    error: errorMsg,
  })
  const apiState = rtkqStore.getState()[todosApi.reducerPath]
  rtkqShape.textContent = JSON.stringify({
    queryKey: Object.keys(apiState.queries),
    status,
    dataLen: data.length,
  }, null, 2)
}
rtkqStore.subscribe(renderRtkq)
renderRtkq()

// ────────────────────────────────────────────────────────────────
// Кнопки
// ────────────────────────────────────────────────────────────────
document.getElementById('classic-fetch')!.addEventListener('click', () => {
  con.log('[classic] dispatch(fetchTodosClassic())')
  // @ts-expect-error — thunk принимается middleware'ом
  classicStore.dispatch(fetchTodosClassic())
})
document.getElementById('classic-clear')!.addEventListener('click', () => {
  classicStore.dispatch({ type: CLEAR })
  con.action({ type: CLEAR }, 'classic')
})

document.getElementById('rtk-fetch')!.addEventListener('click', () => {
  con.log('[rtk] dispatch(fetchTodos())')
  rtkStore.dispatch(fetchTodos())
})
document.getElementById('rtk-clear')!.addEventListener('click', () => {
  const a = clearTodos(); rtkStore.dispatch(a); con.action(a, 'rtk')
})

// RTK Query: держим subscription — чтобы cache не сбрасывался keepUnusedDataFor
type QuerySub = ReturnType<ReturnType<typeof todosApi.endpoints.getTodos.initiate>>
let rtkqSub: QuerySub | null = null

document.getElementById('rtkq-fetch')!.addEventListener('click', () => {
  con.log('[rtkq] dispatch(todosApi.endpoints.getTodos.initiate())')
  if (rtkqSub) rtkqSub.unsubscribe()
  rtkqSub = rtkqStore.dispatch(todosApi.endpoints.getTodos.initiate()) as unknown as QuerySub
  rtkqSub.then(() => con.info('[rtkq] promise resolved'))
})
document.getElementById('rtkq-refetch')!.addEventListener('click', () => {
  con.log('[rtkq] initiate({ forceRefetch: true }) — или тот же cache key → dedup')
  if (rtkqSub) rtkqSub.unsubscribe()
  rtkqSub = rtkqStore.dispatch(
    todosApi.endpoints.getTodos.initiate(undefined, { forceRefetch: true }),
  ) as unknown as QuerySub
})

con.log('Три разных store, три разных подхода к async todos.')
con.info('Откройте DevTools на RTK store (средняя колонка) — увидите pending → fulfilled.')
con.warn('Поставьте галку Simulate fail и нажмите Fetch — увидите разницу в обработке ошибок.')
