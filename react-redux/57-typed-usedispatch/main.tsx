import { createRoot } from 'react-dom/client'
import { useRef } from 'react'
import {
  legacy_createStore as createStore,
  combineReducers,
  applyMiddleware,
} from 'redux'
import { Provider, useSelector, useDispatch } from 'react-redux'
import { thunk } from 'redux-thunk'
import type { ThunkDispatch, ThunkAction } from 'redux-thunk'
import { ConsolePanel } from '../shared/console-panel'

// ================================================
// State
// ================================================

interface UserData { id: number; name: string }
interface UserState {
  status: 'idle' | 'loading' | 'loaded' | 'error'
  data: UserData | null
  error: string | null
}

interface RootState {
  user: UserState
}

type PlainAction =
  | { type: 'user/loading' }
  | { type: 'user/loaded'; payload: UserData }
  | { type: 'user/error'; payload: string }
  | { type: 'user/reset' }

function userReducer(
  state: UserState = { status: 'idle', data: null, error: null },
  action: PlainAction,
): UserState {
  switch (action.type) {
    case 'user/loading': return { status: 'loading', data: null, error: null }
    case 'user/loaded':  return { status: 'loaded',  data: action.payload, error: null }
    case 'user/error':   return { status: 'error',   data: null, error: action.payload }
    case 'user/reset':   return { status: 'idle',    data: null, error: null }
    default: return state
  }
}

const rootReducer = combineReducers({ user: userReducer })

// ================================================
// Store + AppDispatch
// ================================================

const store = createStore(rootReducer, applyMiddleware(thunk))

// КЛЮЧЕВАЯ СТРОКА урока:
// typeof store.dispatch извлекает тип с учётом applyMiddleware(thunk)
// и уже знает, что можно диспатчить функции (thunks), а не только объекты.
export type AppDispatch = typeof store.dispatch

// Pre-typed хук — именно то, что даёт урок 55 + 57 вместе.
const useAppDispatch = useDispatch.withTypes<AppDispatch>()

// ================================================
// Thunk action creator
// ================================================

// Тип thunk: ThunkAction<ReturnType, State, Extra, Action>
const fetchUser = (id: number): ThunkAction<Promise<void>, RootState, unknown, PlainAction> =>
  async dispatch => {
    dispatch({ type: 'user/loading' })
    await new Promise(r => setTimeout(r, 500))
    const names = ['Alice', 'Bob', 'Carol', 'Dave']
    dispatch({
      type: 'user/loaded',
      payload: { id, name: names[(id - 1) % names.length] + ' #' + id },
    })
  }

// ================================================
// Console
// ================================================

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — useDispatch vs useAppDispatch',
)

// ================================================
// Левая карточка — стандартный useDispatch (TS бы ругнулся)
// ================================================

function CardStandard() {
  const rc = useRef(0)
  rc.current++

  // Имитируем «что было бы» на уровне TypeScript без кастов:
  // const dispatch = useDispatch()       — Dispatch<UnknownAction>
  // dispatch(fetchUser(1))               — ошибка компиляции
  //
  // Здесь мы намеренно приводим к ThunkDispatch, чтобы демо хоть что-то делало,
  // но в коде ниже показана реальная ошибка, которую увидит TypeScript.
  const dispatch = useDispatch() as ThunkDispatch<RootState, unknown, PlainAction>
  const user = useSelector((state: RootState) => state.user)

  return (
    <div className="ts-card ts-card--bad">
      <div className="ts-card__header">
        <div className="ts-card__title">useDispatch()  // без типизации</div>
        <div className="ts-card__badge">TS error</div>
      </div>
      <div className="ts-card__demo">
        status:
        <span className={`status-pill status-pill--${user.status}`}>
          {user.status}
        </span>
        <div style={{ marginTop: 6, color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
          {user.data ? `${user.data.id}: ${user.data.name}` : '—'}
        </div>
        <button
          className="btn btn--danger"
          style={{ marginTop: 10 }}
          onClick={() => {
            con.error('standard useDispatch: TS бы не дал такое скомпилировать')
            con.log('  (здесь работает только из-за рантайм-каста `as ThunkDispatch<...>`)')
            dispatch(fetchUser(Math.ceil(Math.random() * 4)))
          }}
        >
          Load user (симуляция)
        </button>
      </div>
      <div className="ts-card__code">
{`function Component() {
  const dispatch = useDispatch()
  // тип: Dispatch<UnknownAction>
  //      — знает только про объекты-экшены

  dispatch({ type: 'user/reset' })  // OK
  dispatch(fetchUser(1))            // ❌ TS2345
}`}
      </div>
      <div className="ts-error">
{`TS2345: Argument of type
  '(dispatch: ThunkDispatch<...>) => Promise<void>'
is not assignable to parameter of type
  'UnknownAction'.`}
      </div>
      <div className="ts-card__metric">рендеров: {rc.current}</div>
    </div>
  )
}

// ================================================
// Правая карточка — useAppDispatch (рабочий путь)
// ================================================

function CardTyped() {
  const rc = useRef(0)
  rc.current++

  const dispatch = useAppDispatch()
  const user = useSelector((state: RootState) => state.user)

  return (
    <div className="ts-card ts-card--good">
      <div className="ts-card__header">
        <div className="ts-card__title">useAppDispatch()  // withTypes&lt;AppDispatch&gt;</div>
        <div className="ts-card__badge">работает</div>
      </div>
      <div className="ts-card__demo">
        status:
        <span className={`status-pill status-pill--${user.status}`}>
          {user.status}
        </span>
        <div style={{ marginTop: 6, color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
          {user.data ? `${user.data.id}: ${user.data.name}` : '—'}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
          <button
            className="btn btn--success"
            onClick={() => {
              const id = Math.ceil(Math.random() * 4)
              con.info(`📤 dispatch(fetchUser(${id}))  // thunk, TS OK`)
              dispatch(fetchUser(id))
            }}
          >
            Load user (thunk)
          </button>
          <button
            className="btn"
            onClick={() => {
              con.log('📤 dispatch({ type: "user/reset" })  // plain action')
              dispatch({ type: 'user/reset' })
            }}
          >
            Reset
          </button>
        </div>
      </div>
      <div className="ts-card__code">
{`// app/store.ts
const store = createStore(
  rootReducer,
  applyMiddleware(thunk),
)
export type AppDispatch = typeof store.dispatch

// app/hooks.ts
export const useAppDispatch =
  useDispatch.withTypes<AppDispatch>()

// Component.tsx
const dispatch = useAppDispatch()
// тип: AppDispatch (знает про thunks)

dispatch({ type: 'user/reset' })  // OK
dispatch(fetchUser(1))            // OK!`}
      </div>
      <div className="ts-card__metric">рендеров: {rc.current}</div>
    </div>
  )
}

// ================================================
// App
// ================================================

function App() {
  return (
    <div>
      <div className="ts-layout">
        <CardStandard />
        <CardTyped />
      </div>

      <div style={{
        padding: 12, background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius)', fontSize: '0.85rem', color: 'var(--text-secondary)'
      }}>
        <strong style={{ color: 'var(--accent-yellow)' }}>Наблюдение:</strong> обе карточки
        читают одну и ту же область state через <code>useSelector</code> и видят одинаковые
        переходы <code>loading</code> → <code>loaded</code>. Разница — в типах: левый
        вариант требует <code>as ThunkDispatch</code>, правый работает без кастов, потому что
        <code> AppDispatch</code> уже знает про middleware.
      </div>
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(
  <Provider store={store}>
    <App />
  </Provider>,
)

// --- Initial log ---

con.info('Стор создан с applyMiddleware(thunk)')
con.log('  type AppDispatch = typeof store.dispatch  // знает про thunks')
con.log('  const useAppDispatch = useDispatch.withTypes<AppDispatch>()')
con.log('')
con.log('При нажатии "Load user (thunk)":')
con.log('  dispatch(fetchUser(id))')
con.log('    → dispatch({ type: "user/loading" })')
con.log('    → await setTimeout(500)')
con.log('    → dispatch({ type: "user/loaded", payload: {...} })')
con.log('')
con.log('Каждый внутренний dispatch:')
con.log('  Subscription.notify() → checkForUpdates → selector → === → forceRender')
