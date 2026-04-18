import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { legacy_createStore as createStore } from 'redux'
import { Provider, connect } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Types ---

type UserId = 'u1' | 'u2' | 'u3'

interface TodoEntry {
  id: number
  text: string
}

interface UsersDict {
  [userId: string]: { name: string }
}

interface TodosByUser {
  [userId: string]: TodoEntry[]
}

interface RootState {
  users: UsersDict
  todos: TodosByUser
}

type Action =
  | { type: 'ADD_TODO'; payload: { userId: UserId; text: string } }

// --- Action creator ---

let nextId = 100
const addTodo = (userId: UserId, text: string): Action => ({
  type: 'ADD_TODO',
  payload: { userId, text },
})

// --- Reducer ---

const initial: RootState = {
  users: {
    u1: { name: 'Алексей' },
    u2: { name: 'Мария' },
    u3: { name: 'Иван' },
  },
  todos: {
    u1: [{ id: 1, text: 'Прочитать docs react-redux' }],
    u2: [{ id: 2, text: 'Развернуть dev-окружение' }, { id: 3, text: 'Написать тест' }],
    u3: [],
  },
}

function reducer(state: RootState = initial, action: Action): RootState {
  switch (action.type) {
    case 'ADD_TODO': {
      const { userId, text } = action.payload
      const entry = { id: ++nextId, text }
      return {
        ...state,
        todos: {
          ...state.todos,
          [userId]: [...(state.todos[userId] ?? []), entry],
        },
      }
    }
    default:
      return state
  }
}

const store = createStore(reducer)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — mergeProps'
)

// ================================================
// Shared profile UI
// ================================================

interface ProfileUIProps {
  userId: UserId
  userName: string
  todos: TodoEntry[]
  onAdd: (text: string) => void
  propsReceived: string[]
}

function ProfileUI({ userId, userName, todos, onAdd, propsReceived }: ProfileUIProps) {
  const [value, setValue] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setValue('')
  }

  return (
    <div className="profile-card">
      <div className="profile-card__header">
        <div className="profile-card__name">{userName}</div>
        <div className="profile-card__id">{userId}</div>
      </div>
      <div className="profile-todos">
        {todos.length === 0
          ? <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem', padding: '6px' }}>
              нет todo у этого юзера
            </div>
          : todos.map(t => (
              <div key={t.id} className="profile-todo">
                <div className="profile-todo__dot" />
                <span>{t.text}</span>
              </div>
            ))
        }
      </div>
      <form className="profile-input-row" onSubmit={submit}>
        <input
          className="profile-input"
          placeholder="Новая задача..."
          value={value}
          onChange={e => setValue(e.target.value)}
        />
        <button type="submit" className="btn btn--sm btn--success">+</button>
      </form>
      <div className="props-received" style={{ marginTop: 8 }}>
        <div className="props-received__title">Компонент получает эти props:</div>
        <div>
          {propsReceived.map((p, i) => (
            <span key={p}>
              <span className="key">{p}</span>
              {i < propsReceived.length - 1 ? <span style={{ color: 'var(--text-muted)' }}>, </span> : null}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ================================================
// Вариант БЕЗ mergeProps
// ================================================

interface RawWithoutProps {
  userId: UserId
  users: UsersDict
  allTodos: TodosByUser
  addTodo: (userId: UserId, text: string) => Action
}

function UserProfileWithoutRaw(props: RawWithoutProps) {
  const userName = props.users[props.userId]?.name ?? '(неизвестен)'
  const todos = props.allTodos[props.userId] ?? []
  const handleAdd = (text: string) => {
    con.log('')
    con.info(`📤 [без mergeProps] props.addTodo("${props.userId}", "${text}")`)
    con.log('  ↳ компонент сам знает про userId и про структуру allTodos')
    props.addTodo(props.userId, text)
  }
  return (
    <ProfileUI
      userId={props.userId}
      userName={userName}
      todos={todos}
      onAdd={handleAdd}
      propsReceived={['userId', 'users', 'allTodos', 'addTodo(userId, text)']}
    />
  )
}

const mapStateWithout = (state: RootState) => ({
  users: state.users,
  allTodos: state.todos,
})
const mapDispatchWithout = { addTodo }

const UserProfileWithout = connect(
  mapStateWithout,
  mapDispatchWithout
)(UserProfileWithoutRaw)

// ================================================
// Вариант С mergeProps
// ================================================

interface RawWithProps {
  userId: UserId
  userName: string
  todos: TodoEntry[]
  addTodo: (text: string) => Action
}

function UserProfileWithRaw(props: RawWithProps) {
  const handleAdd = (text: string) => {
    con.log('')
    con.info(`📤 [с mergeProps] props.addTodo("${text}")`)
    con.log('  ↳ компонент НЕ знает про userId — он уже вшит в addTodo')
    props.addTodo(text)
  }
  return (
    <ProfileUI
      userId={props.userId}
      userName={props.userName}
      todos={props.todos}
      onAdd={handleAdd}
      propsReceived={['userId', 'userName', 'todos', 'addTodo(text)']}
    />
  )
}

interface OwnProps { userId: UserId }

const mapStateWith = (state: RootState, ownProps: OwnProps) => ({
  userName: state.users[ownProps.userId]?.name ?? '(неизвестен)',
  allTodos: state.todos,
})
const mapDispatchWith = { addTodo }

function mergePropsFn(
  stateProps: ReturnType<typeof mapStateWith>,
  dispatchProps: typeof mapDispatchWith,
  ownProps: OwnProps
) {
  return {
    ...ownProps,
    userName: stateProps.userName,
    todos: stateProps.allTodos[ownProps.userId] ?? [],
    addTodo: (text: string) => dispatchProps.addTodo(ownProps.userId, text),
  }
}

const UserProfileWith = connect(
  mapStateWith,
  mapDispatchWith,
  mergePropsFn
)(UserProfileWithRaw)

// ================================================
// App
// ================================================

function App() {
  const [userId, setUserId] = useState<UserId>('u1')

  const users: { id: UserId; name: string }[] = [
    { id: 'u1', name: 'Алексей' },
    { id: 'u2', name: 'Мария' },
    { id: 'u3', name: 'Иван' },
  ]

  return (
    <div>
      <div className="user-switcher">
        <span style={{ alignSelf: 'center', color: 'var(--text-secondary)', fontSize: '0.82rem', marginRight: 6 }}>
          userId (ownProps):
        </span>
        {users.map(u => (
          <button
            key={u.id}
            className={'user-switcher__btn' + (userId === u.id ? ' user-switcher__btn--active' : '')}
            onClick={() => {
              con.log('')
              con.info(`🔀 Смена ownProps.userId → "${u.id}"`)
              setUserId(u.id)
            }}
          >
            {u.name} ({u.id})
          </button>
        ))}
      </div>

      <div className="side-by-side">
        <div className="variant-panel">
          <div className="variant-panel__header">
            <div className="variant-panel__title">Без mergeProps</div>
            <div className="variant-panel__tag variant-panel__tag--without">default shallow merge</div>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--accent-yellow)' }}>
            connect(mapStateToProps, mapDispatchToProps)
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Компонент получает <code>allTodos</code> и <code>addTodo(userId, text)</code>,
            сам фильтрует и сам прокидывает <code>userId</code>.
          </div>
          <UserProfileWithout userId={userId} />
        </div>

        <div className="variant-panel">
          <div className="variant-panel__header">
            <div className="variant-panel__title">С mergeProps</div>
            <div className="variant-panel__tag variant-panel__tag--with">custom merge</div>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--accent-yellow)' }}>
            connect(mapStateToProps, mapDispatchToProps, mergeProps)
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Компонент получает готовые <code>todos</code> и <code>addTodo(text)</code> —
            вся «сборка» спрятана в <code>mergeProps</code>.
          </div>
          <UserProfileWith userId={userId} />
        </div>
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

con.info('mergeProps — третий аргумент connect')
con.log('')
con.log('Сигнатура: (stateProps, dispatchProps, ownProps) => mergedProps')
con.log('По умолчанию: { ...ownProps, ...stateProps, ...dispatchProps } (shallow merge)')
con.log('')
con.log('Левая карточка — без mergeProps. Компонент знает про userId и структуру state.')
con.log('Правая карточка — с mergeProps. Компонент работает только с { todos, addTodo(text) }.')
con.log('')
con.log('Переключайте пользователя сверху — смотрите как оба варианта реагируют на ownProps.')
