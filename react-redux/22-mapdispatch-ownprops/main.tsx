import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import { legacy_createStore as createStore, combineReducers } from 'redux'
import type { Dispatch } from 'redux'
import { Provider, connect, useDispatch, useSelector } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Types ---

interface Todo {
  id: number
  text: string
  done: boolean
}

interface TodosState {
  items: Todo[]
  nextId: number
}

interface RootState {
  todos: TodosState
}

type TodosAction =
  | { type: 'todos/add'; payload: { text: string } }
  | { type: 'todos/toggle'; payload: number }
  | { type: 'todos/remove'; payload: number }

// --- Reducer ---

const initialTodos: TodosState = {
  items: [
    { id: 1, text: 'Изучить mapDispatchToProps', done: true },
    { id: 2, text: 'Разобрать ownProps', done: false },
    { id: 3, text: 'Понять bind-on-props-change', done: false },
  ],
  nextId: 4,
}

function todosReducer(
  state: TodosState = initialTodos,
  action: TodosAction | { type: string; payload?: unknown }
): TodosState {
  switch (action.type) {
    case 'todos/add': {
      const { text } = (action as { payload: { text: string } }).payload
      return {
        items: [...state.items, { id: state.nextId, text, done: false }],
        nextId: state.nextId + 1,
      }
    }
    case 'todos/toggle': {
      const id = (action as { payload: number }).payload
      return {
        ...state,
        items: state.items.map(t => (t.id === id ? { ...t, done: !t.done } : t)),
      }
    }
    case 'todos/remove': {
      const id = (action as { payload: number }).payload
      return { ...state, items: state.items.filter(t => t.id !== id) }
    }
    default:
      return state
  }
}

const rootReducer = combineReducers({ todos: todosReducer })
const store = createStore(rootReducer)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — mapDispatchToProps с ownProps'
)

// ============================================================
// TodoItem — connected with mapDispatchToProps(dispatch, ownProps)
// ============================================================

interface TodoItemOwnProps {
  todoId: number
}

interface TodoItemStateProps {
  todo: Todo | undefined
}

interface TodoItemDispatchProps {
  toggle: () => void
  remove: () => void
}

type TodoItemProps = TodoItemOwnProps & TodoItemStateProps & TodoItemDispatchProps

function TodoItemRaw(props: TodoItemProps) {
  if (!props.todo) return null
  const { todo, toggle, remove } = props

  return (
    <div className={`todo-item ${todo.done ? 'todo-item--done' : ''}`}>
      <div
        className={`todo-item__checkbox ${todo.done ? 'todo-item__checkbox--checked' : ''}`}
        onClick={toggle}
      >
        {todo.done ? '✓' : ''}
      </div>
      <span className="todo-item__id">id:{todo.id}</span>
      <span className="todo-item__text">{todo.text}</span>
      <button className="todo-item__remove" onClick={remove}>удалить</button>
    </div>
  )
}

const mapStateToProps = (
  state: RootState,
  ownProps: TodoItemOwnProps
): TodoItemStateProps => ({
  todo: state.todos.items.find(t => t.id === ownProps.todoId),
})

const mapDispatchToProps = (
  dispatch: Dispatch<TodosAction>,
  ownProps: TodoItemOwnProps
): TodoItemDispatchProps => {
  con.info(
    `mapDispatchToProps пересобрана для todoId=${ownProps.todoId} ` +
      `(пересчёт при смене ownProps)`
  )
  return {
    toggle: () => {
      con.success(
        `[id=${ownProps.todoId}] props.toggle() → ` +
          `dispatch({ type: 'todos/toggle', payload: ${ownProps.todoId} })`
      )
      dispatch({ type: 'todos/toggle', payload: ownProps.todoId })
    },
    remove: () => {
      con.success(
        `[id=${ownProps.todoId}] props.remove() → ` +
          `dispatch({ type: 'todos/remove', payload: ${ownProps.todoId} })`
      )
      dispatch({ type: 'todos/remove', payload: ownProps.todoId })
    },
  }
}

const TodoItem = connect<
  TodoItemStateProps,
  TodoItemDispatchProps,
  TodoItemOwnProps,
  RootState
>(
  mapStateToProps,
  mapDispatchToProps
)(TodoItemRaw)

// ============================================================
// List parent
// ============================================================

function TodoList() {
  const items = useSelector((s: RootState) => s.todos.items)
  const dispatch = useDispatch()
  const [text, setText] = useState('')

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, maxWidth: 560, margin: '0 auto 14px' }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Новая задача..."
          style={{
            flex: 1,
            padding: '8px 10px',
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontFamily: 'inherit',
          }}
        />
        <button
          className="btn btn--accent"
          onClick={() => {
            if (!text.trim()) return
            con.log('')
            con.info(`dispatch({ type: 'todos/add', payload: { text: '${text}' } })`)
            dispatch({ type: 'todos/add', payload: { text } })
            setText('')
          }}
        >
          Добавить
        </button>
      </div>

      <div className="todo-list">
        {items.map(t => (
          <TodoItem key={t.id} todoId={t.id} />
        ))}
        {items.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>
            Список пуст — добавьте задачу выше.
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.82rem',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <div style={{ color: 'var(--accent-yellow)', fontWeight: 600, marginBottom: 4 }}>
          Что делать для проверки:
        </div>
        <div>1. Нажмите checkbox любого todo — в логе видно «props.toggle()» без аргументов.</div>
        <div>2. Добавьте новую задачу — mapDispatchToProps вызовется для новой ownProps.todoId.</div>
        <div>3. Удалите задачу — mapDispatchToProps у соседей НЕ пересчитывается (ownProps не изменились).</div>
      </div>
    </div>
  )
}

// --- Render ---

const root = createRoot(document.getElementById('root')!)
root.render(
  <Provider store={store}>
    <TodoList />
  </Provider>
)

// --- Initial log ---

con.info('mapDispatchToProps(dispatch, ownProps) — bind on props change')
con.log('')
con.log('Каждый TodoItem подключён через connect(mapStateToProps, mapDispatchToProps).')
con.log('mapDispatchToProps.length === 2 → react-redux передаёт ownProps.')
con.log('')
con.log('В замыкании используется ownProps.todoId, поэтому props.toggle()')
con.log('и props.remove() вызываются БЕЗ аргументов.')
