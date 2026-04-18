import { createRoot } from 'react-dom/client'
import { useRef } from 'react'
import { legacy_createStore as createStore, combineReducers } from 'redux'
import { Provider, connect } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Types ---

interface UserState {
  name: string | null
  email: string | null
  role: 'guest' | 'user' | 'admin'
}

interface RootState {
  user: UserState
}

type Action =
  | { type: 'user/login'; payload: { name: string; email: string; role: UserState['role'] } }
  | { type: 'user/logout' }
  | { type: 'user/promote' }

// --- Reducer ---

const userInitial: UserState = {
  name: null,
  email: null,
  role: 'guest',
}

function userReducer(state = userInitial, action: Action): UserState {
  switch (action.type) {
    case 'user/login':
      return {
        name: action.payload.name,
        email: action.payload.email,
        role: action.payload.role,
      }
    case 'user/logout':
      return userInitial
    case 'user/promote':
      return state.role === 'user' ? { ...state, role: 'admin' } : state
    default:
      return state
  }
}

const rootReducer = combineReducers({ user: userReducer })
const store = createStore(rootReducer)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — connect() Returns'
)

// --- Shared mapStateToProps / mapDispatchToProps ---

const mapStateToProps = (state: RootState) => ({
  name: state.user.name,
  email: state.user.email,
  role: state.user.role,
})

const mapDispatchToProps = {
  login: () => ({
    type: 'user/login' as const,
    payload: { name: 'Анна Иванова', email: 'anna@example.com', role: 'user' as const },
  }),
  logout: () => ({ type: 'user/logout' as const }),
  promote: () => ({ type: 'user/promote' as const }),
}

// --- Этап 1: настройка HOC (сохраняем wrapper в переменной) ---

const connectUser = connect(mapStateToProps, mapDispatchToProps)

// typeof connectUser === 'function' — это wrapper-функция, ещё не компонент.

interface UserProps {
  name: string | null
  email: string | null
  role: UserState['role']
  login: () => Action
  logout: () => Action
  promote: () => Action
}

// --- Три презентационных компонента ---

function LoginRaw(props: UserProps) {
  const rc = useRef(0)
  rc.current++
  const isGuest = props.role === 'guest'
  return (
    <div className="reuse-card reuse-card--login">
      <div className="reuse-card__header">
        <div className="reuse-card__title">Login</div>
        <div className="reuse-card__renders">рендеров: {rc.current}</div>
      </div>
      <div className="reuse-card__body">
        {'status: ' + (isGuest ? 'не авторизован' : 'авторизован') + '\n' +
          'role: ' + props.role + '\n' +
          'name: ' + (props.name ?? 'null')}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn btn--success" disabled={!isGuest} onClick={() => props.login()}>
          Login
        </button>
        <button className="btn btn--danger" disabled={isGuest} onClick={() => props.logout()}>
          Logout
        </button>
      </div>
    </div>
  )
}

function ProfileRaw(props: UserProps) {
  const rc = useRef(0)
  rc.current++
  return (
    <div className="reuse-card reuse-card--profile">
      <div className="reuse-card__header">
        <div className="reuse-card__title">Profile</div>
        <div className="reuse-card__renders">рендеров: {rc.current}</div>
      </div>
      <div className="reuse-card__body">
        {'name:  ' + (props.name ?? '(нет)') + '\n' +
          'email: ' + (props.email ?? '(нет)')}
      </div>
    </div>
  )
}

function SettingsRaw(props: UserProps) {
  const rc = useRef(0)
  rc.current++
  const canPromote = props.role === 'user'
  return (
    <div className="reuse-card reuse-card--settings">
      <div className="reuse-card__header">
        <div className="reuse-card__title">Settings</div>
        <div className="reuse-card__renders">рендеров: {rc.current}</div>
      </div>
      <div className="reuse-card__body">
        {'role: ' + props.role + '\n' +
          (canPromote ? 'можно повысить до admin' : 'действий недоступно')}
      </div>
      <button
        className="btn btn--accent"
        disabled={!canPromote}
        onClick={() => props.promote()}
      >
        Promote to admin
      </button>
    </div>
  )
}

// --- Этап 2: применяем один и тот же wrapper к трём компонентам ---

const ConnectedLogin    = connectUser(LoginRaw)
const ConnectedProfile  = connectUser(ProfileRaw)
const ConnectedSettings = connectUser(SettingsRaw)

// --- App ---

function App() {
  return (
    <div>
      <div className="controls">
        <button
          className="btn btn--accent"
          onClick={() => {
            con.log('')
            con.info('📤 dispatch(login()) — обновятся все три связанных компонента')
            store.dispatch({
              type: 'user/login',
              payload: { name: 'Анна Иванова', email: 'anna@example.com', role: 'user' },
            })
          }}
        >
          Login (внешний dispatch)
        </button>
        <button
          className="btn btn--danger"
          onClick={() => {
            con.log('')
            con.info('📤 dispatch(logout()) — обновятся все три связанных компонента')
            store.dispatch({ type: 'user/logout' })
          }}
        >
          Logout (внешний dispatch)
        </button>
      </div>

      <div className="reuse-grid">
        <ConnectedLogin />
        <ConnectedProfile />
        <ConnectedSettings />
      </div>

      <div style={{
        padding: 12, background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius)', fontSize: '0.85rem', color: 'var(--text-secondary)'
      }}>
        <strong style={{ color: 'var(--accent-yellow)' }}>Наблюдение:</strong> все три карточки
        подключены <strong>одним и тем же</strong> wrapper-ом{' '}
        <code>connectUser = connect(mapStateToProps, mapDispatchToProps)</code>. При
        <code> dispatch</code> все три карточки получают новый snapshot store и их счётчики
        рендеров растут синхронно. Внутри Subscription у них — три независимых записи в
        linked list callback'ов.
      </div>
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(
  <Provider store={store}>
    <App />
  </Provider>
)

// --- Initial log ---

con.info('connect() Returns — двухэтапный вызов: первая часть возвращает функцию-обёртку')
con.log('')
con.log('Этап 1: const connectUser = connect(mapStateToProps, mapDispatchToProps)')
con.log('        typeof connectUser === "function"  // wrapper, не компонент')
con.log('')
con.log('Этап 2: const ConnectedLogin    = connectUser(Login)')
con.log('        const ConnectedProfile  = connectUser(Profile)')
con.log('        const ConnectedSettings = connectUser(Settings)')
con.log('')
con.log('Один wrapper — три подключённых компонента с одинаковым mapping.')
