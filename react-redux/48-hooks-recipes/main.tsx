import { useMemo, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { legacy_createStore as createStore, combineReducers, bindActionCreators, type Dispatch } from 'redux'
import { Provider, useSelector, useDispatch, shallowEqual } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Types ---

interface CounterState { value: number }
interface UserState   { name: string; age: number; email: string }
interface LogState    { history: string[] }

interface RootState {
  counter: CounterState
  user: UserState
  log: LogState
}

type AppAction =
  | { type: 'INCREMENT' }
  | { type: 'DECREMENT' }
  | { type: 'SET_TO'; payload: number }
  | { type: 'RESET_COUNTER' }
  | { type: 'SET_NAME'; payload: string }
  | { type: 'SET_AGE'; payload: number }
  | { type: 'SET_EMAIL'; payload: string }
  | { type: 'LOG'; payload: string }

// --- Reducers ---

function counterReducer(state: CounterState = { value: 0 }, action: AppAction): CounterState {
  switch (action.type) {
    case 'INCREMENT':     return { value: state.value + 1 }
    case 'DECREMENT':     return { value: state.value - 1 }
    case 'SET_TO':        return { value: action.payload }
    case 'RESET_COUNTER': return { value: 0 }
    default: return state
  }
}

function userReducer(
  state: UserState = { name: 'Алексей', age: 28, email: 'alexey@example.com' },
  action: AppAction
): UserState {
  switch (action.type) {
    case 'SET_NAME':  return { ...state, name: action.payload }
    case 'SET_AGE':   return { ...state, age: action.payload }
    case 'SET_EMAIL': return { ...state, email: action.payload }
    default: return state
  }
}

function logReducer(state: LogState = { history: [] }, action: AppAction): LogState {
  switch (action.type) {
    case 'LOG': return { history: [...state.history, action.payload].slice(-5) }
    default: return state
  }
}

const rootReducer = combineReducers({
  counter: counterReducer,
  user: userReducer,
  log: logReducer,
})

const store = createStore(rootReducer)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — hooks recipes'
)

// --- Action creators ---

const increment = (): AppAction => ({ type: 'INCREMENT' })
const decrement = (): AppAction => ({ type: 'DECREMENT' })
const setTo     = (n: number): AppAction => ({ type: 'SET_TO', payload: n })
const resetCounter = (): AppAction => ({ type: 'RESET_COUNTER' })
const logEvent  = (msg: string): AppAction => ({ type: 'LOG', payload: msg })

// ================================================
// Рецепт 1: useActions
// ================================================

type ActionCreator = (...args: any[]) => AppAction
type ActionCreatorsMap = Record<string, ActionCreator>

function useActions<M extends ActionCreatorsMap>(actions: M, deps?: unknown[]): M
function useActions<M extends ActionCreatorsMap>(actions: M[], deps?: unknown[]): M[]
function useActions(actions: any, deps?: unknown[]): any {
  const dispatch = useDispatch<Dispatch<AppAction>>()
  return useMemo(() => {
    if (Array.isArray(actions)) {
      return actions.map(a => bindActionCreators(a, dispatch))
    }
    return bindActionCreators(actions, dispatch)
  }, deps ? [dispatch, ...deps] : [dispatch])
}

// ================================================
// Рецепт 2: useShallowEqualSelector
// ================================================

function useShallowEqualSelector<Selected>(
  selector: (state: RootState) => Selected
): Selected {
  return useSelector(selector, shallowEqual)
}

// ================================================
// CardWithUseActions — счётчик через useActions
// ================================================

function CardWithUseActions() {
  const value = useSelector((state: RootState) => state.counter.value)
  const renders = useRef(0)
  renders.current++

  const { inc, dec, set5, reset } = useActions({
    inc: increment,
    dec: decrement,
    set5: () => setTo(5),
    reset: resetCounter,
  })

  con.success(`[useActions]             рендер #${renders.current} · counter = ${value}`)

  return (
    <div className="recipe-card">
      <div className="recipe-card__header">
        <div className="recipe-card__title">useActions(...)</div>
        <div className="recipe-card__renders">рендеров: {renders.current}</div>
      </div>
      <div className="recipe-card__value">{value}</div>
      <div className="recipe-card__buttons">
        <button className="btn btn--sm btn--success" onClick={inc}>inc()</button>
        <button className="btn btn--sm" onClick={dec}>dec()</button>
        <button className="btn btn--sm btn--accent" onClick={set5}>set5()</button>
        <button className="btn btn--sm btn--danger" onClick={reset}>reset()</button>
      </div>
      <div className="recipe-card__stat">
        <span>handlers вызваны без упоминания dispatch</span>
        <strong>через bindActionCreators</strong>
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
        Внутри <code>bindActionCreators</code> оборачивает каждый creator в функцию,
        автоматически диспатчащую результат.
      </div>
    </div>
  )
}

// ================================================
// CardWithShallowEqual — профиль через useShallowEqualSelector
// ================================================

function CardWithShallowEqual() {
  const { name, age } = useShallowEqualSelector(state => ({
    name: state.user.name,
    age: state.user.age,
  }))
  const renders = useRef(0)
  renders.current++
  con.success(`[useShallowEqualSelector] рендер #${renders.current} · {name: "${name}", age: ${age}}`)

  const dispatch = useDispatch<Dispatch<AppAction>>()

  return (
    <div className="recipe-card">
      <div className="recipe-card__header">
        <div className="recipe-card__title">useShallowEqualSelector(...)</div>
        <div className="recipe-card__renders">рендеров: {renders.current}</div>
      </div>
      <div className="recipe-card__value" style={{ fontSize: '1rem' }}>
        {name}, {age}
      </div>
      <div className="recipe-card__buttons">
        <button className="btn btn--sm btn--accent" onClick={() => {
          const names = ['Мария', 'Дмитрий', 'Анна', 'Сергей', 'Алексей']
          const next = names[Math.floor(Math.random() * names.length)]
          con.log(''); con.warn(`dispatch({ type: "SET_NAME", payload: "${next}" })`)
          dispatch({ type: 'SET_NAME', payload: next })
        }}>Сменить имя</button>
        <button className="btn btn--sm" onClick={() => {
          const age = Math.floor(Math.random() * 60) + 18
          con.log(''); con.warn(`dispatch({ type: "SET_AGE", payload: ${age} })`)
          dispatch({ type: 'SET_AGE', payload: age })
        }}>Сменить возраст</button>
        <button className="btn btn--sm" onClick={() => {
          con.log(''); con.warn('dispatch({ type: "SET_EMAIL" }) — другое поле user')
          dispatch({ type: 'SET_EMAIL', payload: `u${Date.now() % 1000}@example.com` })
        }}>Сменить email (unrelated)</button>
      </div>
      <div className="recipe-card__stat">
        <span>selector возвращает объект {'{name, age}'}</span>
        <strong>shallowEqual</strong>
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
        Смена email — unrelated поле, rerender не должен произойти.
      </div>
    </div>
  )
}

// ================================================
// Без shallowEqual — контраст
// ================================================

function CardWithoutShallow() {
  const userObj = useSelector((state: RootState) => ({
    name: state.user.name,
    age: state.user.age,
  }))
  const renders = useRef(0)
  renders.current++
  con.error(`[без shallowEqual]       рендер #${renders.current} · {name: "${userObj.name}", age: ${userObj.age}} — новая ссылка на КАЖДОМ dispatch`)

  return (
    <div className="recipe-card" style={{ borderColor: 'rgba(244, 71, 71, 0.4)' }}>
      <div className="recipe-card__header">
        <div className="recipe-card__title" style={{ color: 'var(--accent-red)' }}>
          useSelector(state =&gt; ({'{ name, age }'})) БЕЗ shallowEqual
        </div>
        <div className="recipe-card__renders">рендеров: {renders.current}</div>
      </div>
      <div className="recipe-card__value" style={{ fontSize: '1rem', color: 'var(--accent-red)' }}>
        {userObj.name}, {userObj.age}
      </div>
      <div className="recipe-card__stat">
        <span>каждый рендер — новый объект</span>
        <strong style={{ color: 'var(--accent-red)' }}>=== → всегда false</strong>
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
        Для сравнения: selector, возвращающий объект без shallowEqual — ре-рендер на каждом dispatch.
      </div>
    </div>
  )
}

// ================================================
// DispatchDirect — как выглядит идиоматичный современный react-redux
// ================================================

function DispatchDirect() {
  const value = useSelector((state: RootState) => state.counter.value)
  const dispatch = useDispatch<Dispatch<AppAction>>()
  const renders = useRef(0)
  renders.current++
  con.info(`[useDispatch + creator]  рендер #${renders.current} · counter = ${value}`)

  return (
    <div className="recipe-card" style={{ borderColor: 'rgba(76, 175, 80, 0.4)' }}>
      <div className="recipe-card__header">
        <div className="recipe-card__title" style={{ color: 'var(--success)' }}>
          useDispatch + dispatch(actionCreator())
        </div>
        <div className="recipe-card__renders">рендеров: {renders.current}</div>
      </div>
      <div className="recipe-card__value">{value}</div>
      <div className="recipe-card__buttons">
        <button className="btn btn--sm btn--success" onClick={() => dispatch(increment())}>
          dispatch(increment())
        </button>
        <button className="btn btn--sm" onClick={() => dispatch(decrement())}>
          dispatch(decrement())
        </button>
      </div>
      <div className="recipe-card__stat">
        <span>явный dispatch — рекомендация Дэна Абрамова</span>
        <strong style={{ color: 'var(--success)' }}>идиоматично</strong>
      </div>
    </div>
  )
}

// ================================================
// LogPanel — unrelated state (чтобы видеть ре-рендеры соседей)
// ================================================

function LogPanel() {
  const history = useSelector((state: RootState) => state.log.history)
  return (
    <div className="panel-note">
      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
        История (unrelated slice state.log.history)
      </div>
      <div className="history-feedback">
        {history.length === 0
          ? <span style={{ fontStyle: 'italic' }}>— пусто —</span>
          : history.map((h, i) => <div key={i}>· {h}</div>)}
      </div>
    </div>
  )
}

// ================================================
// App
// ================================================

function App() {
  return (
    <div>
      <div className="global-controls">
        <button className="btn btn--success" onClick={() => {
          con.log(''); con.info('dispatch(increment()) — unrelated к пользователю')
          store.dispatch(increment())
          store.dispatch(logEvent(`INCREMENT at ${new Date().toLocaleTimeString('ru-RU')}`))
        }}>dispatch(increment()) + log</button>
        <button className="btn" onClick={() => {
          con.log(''); con.info('dispatch(logEvent(...)) — unrelated и к user, и к counter')
          store.dispatch(logEvent(`ping at ${new Date().toLocaleTimeString('ru-RU')}`))
        }}>Только добавить в log</button>
      </div>

      <div className="recipe-grid">
        <CardWithUseActions />
        <CardWithShallowEqual />
      </div>

      <div className="recipe-grid">
        <DispatchDirect />
        <CardWithoutShallow />
      </div>

      <LogPanel />
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

con.info('Урок 48 — Hooks Recipes: useActions + useShallowEqualSelector')
con.log('')
con.log('useActions            — обёртка над bindActionCreators + useDispatch (удалён в alpha)')
con.log('useShallowEqualSelector — useSelector(..., shallowEqual) короче')
con.log('')
con.log('Нажмите «Сменить email» — unrelated для панели со shallowEqual.')
con.log('Card со shallowEqual НЕ ре-рендерится. Card без shallowEqual — ре-рендерится.')
