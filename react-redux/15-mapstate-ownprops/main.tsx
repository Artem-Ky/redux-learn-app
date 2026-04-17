import { useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { legacy_createStore as createStore } from 'redux'
import { Provider, connect, useSelector, useDispatch } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Redux Setup ---

interface Todo {
  text: string
  done: boolean
}

interface AppState {
  todos: Record<number, Todo>
  ids: number[]
  nextId: number
}

const initialState: AppState = {
  todos: {
    0: { text: 'Изучить Redux', done: true },
    1: { text: 'Изучить React-Redux', done: false },
    2: { text: 'Понять connect()', done: false },
    3: { text: 'Освоить mapStateToProps', done: false },
  },
  ids: [0, 1, 2, 3],
  nextId: 4,
}

interface AppAction {
  type: string
  payload?: any
}

function rootReducer(state = initialState, action: AppAction): AppState {
  switch (action.type) {
    case 'todo/toggle': {
      const id = action.payload as number
      const todo = state.todos[id]
      if (!todo) return state
      return {
        ...state,
        todos: {
          ...state.todos,
          [id]: { ...todo, done: !todo.done },
        },
      }
    }
    case 'todo/add': {
      const text = action.payload as string
      const id = state.nextId
      return {
        ...state,
        todos: { ...state.todos, [id]: { text, done: false } },
        ids: [...state.ids, id],
        nextId: id + 1,
      }
    }
    default:
      return state
  }
}

const store = createStore(rootReducer)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — mapStateToProps с ownProps'
)

// --- TodoItem (connected with ownProps) ---

interface TodoItemOwnProps {
  id: number
}

interface TodoItemStateProps {
  todo: Todo
}

interface TodoItemDispatchProps {
  dispatch: (action: AppAction) => void
}

type TodoItemProps = TodoItemOwnProps & TodoItemStateProps & TodoItemDispatchProps

function TodoItem({ id, todo, dispatch }: TodoItemProps) {
  const renders = useRef(0)
  renders.current++

  con.info(`<TodoItem id=${id}> рендер #${renders.current}, todo=${JSON.stringify(todo)}`)

  return (
    <div
      className="todo-item"
      style={{
        borderColor: todo.done ? 'var(--success)' : 'var(--border)',
        background: todo.done ? 'rgba(76, 175, 80, 0.04)' : 'var(--bg-panel)',
      }}
    >
      <input
        type="checkbox"
        className="todo-item__checkbox"
        checked={todo.done}
        onChange={() => {
          con.log('────────────────────────────')
          con.warn(`dispatch({ type: "todo/toggle", payload: ${id} })`)
          con.log(`  Только TodoItem id=${id} должен ре-рендериться`)
          dispatch({ type: 'todo/toggle', payload: id })
        }}
      />
      <span className={`todo-item__text ${todo.done ? 'done' : ''}`}>
        {todo.text}
      </span>
      <span className="todo-item__meta">
        id={id} | рендеров: {renders.current}
      </span>
    </div>
  )
}

const mapStateToProps = (state: AppState, ownProps: TodoItemOwnProps): TodoItemStateProps => {
  con.log(`  mapStateToProps(state, { id: ${ownProps.id} }) → todo: ${JSON.stringify(state.todos[ownProps.id])}`)
  return { todo: state.todos[ownProps.id] }
}

const ConnectedTodoItem = connect(mapStateToProps)(TodoItem)

// --- TodoList (reads ids from store) ---

function TodoList() {
  const ids = useSelector((s: AppState) => s.ids)
  const dispatch = useDispatch()

  return (
    <div>
      <div style={{ marginBottom: '12px' }}>
        {ids.map((id) => (
          <ConnectedTodoItem key={id} id={id} />
        ))}
      </div>
      <button
        className="btn btn--sm btn--accent"
        onClick={() => {
          const texts = [
            'Написать тесты',
            'Сделать code review',
            'Обновить документацию',
            'Исправить баг',
            'Добавить фичу',
          ]
          const text = texts[Math.floor(Math.random() * texts.length)]
          con.log('────────────────────────────')
          con.warn(`dispatch({ type: "todo/add", payload: "${text}" })`)
          dispatch({ type: 'todo/add', payload: text })
        }}
      >
        + Добавить todo
      </button>
    </div>
  )
}

function App() {
  return (
    <div>
      <div style={{
        background: '#0d0d0d', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)', padding: '12px 16px',
        fontFamily: 'var(--font-mono)', fontSize: '0.82rem',
        color: 'var(--text-secondary)', marginBottom: '12px',
      }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
          mapStateToProps с ownProps
        </div>
        <span style={{ color: 'var(--accent-purple)' }}>const</span> mapStateToProps = (<span style={{ color: 'var(--accent-orange)' }}>state</span>, <span style={{ color: 'var(--accent-orange)' }}>ownProps</span>) =&gt; {'({'}<br />
        {'  '}<span style={{ color: '#9cdcfe' }}>todo</span>: state.<span style={{ color: '#9cdcfe' }}>todos</span>[ownProps.<span style={{ color: '#9cdcfe' }}>id</span>]<br />
        {'}'})
      </div>
      <TodoList />
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

con.info('Урок 15: mapStateToProps с ownProps')
con.log('')
con.log('mapStateToProps = (state, ownProps) => ({')
con.log('  todo: state.todos[ownProps.id]')
con.log('})')
con.log('')
con.log('Каждый TodoItem получает id от родителя (ownProps)')
con.log('и читает СВОЙ todo из store.')
con.log('')
con.info('Отметьте todo — только один элемент ре-рендерится!')
con.log('Следите за счётчиками "рендеров" справа от каждого элемента.')
