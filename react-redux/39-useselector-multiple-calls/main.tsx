import { createRoot } from 'react-dom/client'
import { legacy_createStore as createStore, combineReducers } from 'redux'
import { Provider, useSelector, shallowEqual } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Types ---

interface UserState { name: string; age: number }
interface TodosState { list: string[] }
interface UIState { theme: 'light' | 'dark'; loading: boolean }

interface RootState {
  user: UserState
  todos: TodosState
  ui: UIState
}

type AppAction =
  | { type: 'SET_NAME'; payload: string }
  | { type: 'INC_AGE' }
  | { type: 'ADD_TODO' }
  | { type: 'TOGGLE_THEME' }
  | { type: 'TOGGLE_LOADING' }
  | { type: 'MULTI_DISPATCH' }
  | { type: 'RESET' }

// --- Reducers ---

function userReducer(state: UserState = { name: 'Alice', age: 20 }, action: AppAction): UserState {
  switch (action.type) {
    case 'SET_NAME': return { ...state, name: action.payload }
    case 'INC_AGE': return { ...state, age: state.age + 1 }
    case 'RESET': return { name: 'Alice', age: 20 }
    default: return state
  }
}

function todosReducer(state: TodosState = { list: [] }, action: AppAction): TodosState {
  switch (action.type) {
    case 'ADD_TODO': return { list: [...state.list, `task #${state.list.length + 1}`] }
    case 'RESET': return { list: [] }
    default: return state
  }
}

function uiReducer(state: UIState = { theme: 'dark', loading: false }, action: AppAction): UIState {
  switch (action.type) {
    case 'TOGGLE_THEME': return { ...state, theme: state.theme === 'dark' ? 'light' : 'dark' }
    case 'TOGGLE_LOADING': return { ...state, loading: !state.loading }
    case 'RESET': return { theme: 'dark', loading: false }
    default: return state
  }
}

const rootReducer = combineReducers({
  user: userReducer,
  todos: todosReducer,
  ui: uiReducer,
})
const store = createStore(rootReducer)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — один vs много useSelector'
)

// --- Render counters ---

const rc = { one: 0, many: 0 }

// --- Variant 1: one useSelector + shallowEqual ---

function ComponentOne() {
  const data = useSelector((state: RootState) => ({
    userName: state.user.name,
    userAge: state.user.age,
    todoCount: state.todos.list.length,
    theme: state.ui.theme,
    loading: state.ui.loading,
  }), shallowEqual)
  rc.one++
  con.info(`[ONE] рендер #${rc.one} · data = { ${Object.entries(data).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ')} }`)

  return (
    <div className="ml-card ml-card--one">
      <div>
        <div className="ml-card__title">1. Один useSelector + shallowEqual</div>
        <div className="ml-card__subtitle">один вызов возвращает весь объект</div>
      </div>
      <div className="ml-card__code">{`const data = useSelector(state => ({
  userName: state.user.name,
  userAge: state.user.age,
  todoCount: state.todos.list.length,
  theme: state.ui.theme,
  loading: state.ui.loading,
}), shallowEqual)`}</div>
      <div className="ml-card__fields">
        <div className="ml-card__field"><span className="ml-card__field-key">userName</span><span className="ml-card__field-val">"{data.userName}"</span></div>
        <div className="ml-card__field"><span className="ml-card__field-key">userAge</span><span className="ml-card__field-val">{data.userAge}</span></div>
        <div className="ml-card__field"><span className="ml-card__field-key">todoCount</span><span className="ml-card__field-val">{data.todoCount}</span></div>
        <div className="ml-card__field"><span className="ml-card__field-key">theme</span><span className="ml-card__field-val">"{data.theme}"</span></div>
        <div className="ml-card__field"><span className="ml-card__field-key">loading</span><span className="ml-card__field-val">{String(data.loading)}</span></div>
      </div>
      <div className="ml-card__subs">
        подписок на store: <strong>1</strong>
      </div>
      <div className="ml-card__rr">
        <span className="ml-card__rr-label">рендеров</span>
        <span className="ml-card__rr-val">{rc.one}</span>
      </div>
    </div>
  )
}

// --- Variant 2: five separate useSelector ---

function ComponentMany() {
  const userName = useSelector((state: RootState) => state.user.name)
  const userAge = useSelector((state: RootState) => state.user.age)
  const todoCount = useSelector((state: RootState) => state.todos.list.length)
  const theme = useSelector((state: RootState) => state.ui.theme)
  const loading = useSelector((state: RootState) => state.ui.loading)
  rc.many++
  con.success(`[MANY] рендер #${rc.many} · name="${userName}" age=${userAge} todos=${todoCount} theme=${theme} loading=${loading}`)

  return (
    <div className="ml-card ml-card--many">
      <div>
        <div className="ml-card__title">2. Пять отдельных useSelector</div>
        <div className="ml-card__subtitle">каждое поле — свой хук, свой <code>===</code></div>
      </div>
      <div className="ml-card__code">{`const userName  = useSelector(s => s.user.name)
const userAge   = useSelector(s => s.user.age)
const todoCount = useSelector(s => s.todos.list.length)
const theme     = useSelector(s => s.ui.theme)
const loading   = useSelector(s => s.ui.loading)`}</div>
      <div className="ml-card__fields">
        <div className="ml-card__field"><span className="ml-card__field-key">userName</span><span className="ml-card__field-val">"{userName}"</span></div>
        <div className="ml-card__field"><span className="ml-card__field-key">userAge</span><span className="ml-card__field-val">{userAge}</span></div>
        <div className="ml-card__field"><span className="ml-card__field-key">todoCount</span><span className="ml-card__field-val">{todoCount}</span></div>
        <div className="ml-card__field"><span className="ml-card__field-key">theme</span><span className="ml-card__field-val">"{theme}"</span></div>
        <div className="ml-card__field"><span className="ml-card__field-key">loading</span><span className="ml-card__field-val">{String(loading)}</span></div>
      </div>
      <div className="ml-card__subs">
        подписок на store: <strong>5</strong> (по одной на каждый хук)
      </div>
      <div className="ml-card__rr">
        <span className="ml-card__rr-label">рендеров</span>
        <span className="ml-card__rr-val">{rc.many}</span>
      </div>
    </div>
  )
}

function App() {
  const dispatchAndLog = (action: AppAction, label: string) => {
    con.log('')
    con.info(`📤 store.dispatch(${label})`)
    store.dispatch(action)
  }

  const multiDispatch = () => {
    con.log('')
    con.info('📤 handler с 3 подряд dispatch — React батчит всё в один рендер')
    store.dispatch({ type: 'SET_NAME', payload: store.getState().user.name === 'Alice' ? 'Bob' : 'Alice' })
    store.dispatch({ type: 'INC_AGE' })
    store.dispatch({ type: 'TOGGLE_THEME' })
  }

  return (
    <div>
      <div className="global-controls">
        <button className="btn btn--accent" onClick={() => {
          const next = store.getState().user.name === 'Alice' ? 'Bob' : 'Alice'
          dispatchAndLog({ type: 'SET_NAME', payload: next }, `{ type: "SET_NAME", payload: "${next}" }`)
        }}>set name</button>
        <button className="btn" onClick={() => dispatchAndLog({ type: 'INC_AGE' }, '{ type: "INC_AGE" }')}>
          age +1
        </button>
        <button className="btn btn--success" onClick={() => dispatchAndLog({ type: 'ADD_TODO' }, '{ type: "ADD_TODO" }')}>
          add todo
        </button>
        <button className="btn" onClick={() => dispatchAndLog({ type: 'TOGGLE_THEME' }, '{ type: "TOGGLE_THEME" }')}>
          toggle theme
        </button>
        <button className="btn" onClick={() => dispatchAndLog({ type: 'TOGGLE_LOADING' }, '{ type: "TOGGLE_LOADING" }')}>
          toggle loading
        </button>
        <button className="btn btn--accent" onClick={multiDispatch}>
          3 dispatch в одном handler
        </button>
        <button className="btn btn--danger" onClick={() => dispatchAndLog({ type: 'RESET' }, '{ type: "RESET" }')}>
          reset
        </button>
      </div>

      <div className="ml-grid">
        <ComponentOne />
        <ComponentMany />
      </div>
    </div>
  )
}

// --- Render ---

const root = createRoot(document.getElementById('root')!)
root.render(
  <Provider store={store}>
    <App />
  </Provider>
)

// --- Initial log ---

con.info('Один useSelector-объект vs пять отдельных — счётчики рендеров')
con.log('')
con.log('Оба компонента читают 5 полей. Вариант 1 — один useSelector + shallowEqual.')
con.log('Вариант 2 — пять отдельных useSelector.')
con.log('')
con.log('При любом dispatch оба компонента рендерятся одинаковое число раз,')
con.log('благодаря автоматическому батчингу React. Попробуйте "3 dispatch в одном handler" —')
con.log('даже при трёх подряд dispatch будет один ре-рендер каждого компонента.')
