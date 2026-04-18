import { Component, useRef, useState } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { createRoot } from 'react-dom/client'
import { legacy_createStore as createStore, combineReducers } from 'redux'
import { Provider, useSelector, useDispatch } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Types ---

interface Todo { id: number; text: string; done: boolean }
interface TodosState { byId: Record<number, Todo>; ids: number[] }
interface RootState { todos: TodosState }

type AppAction =
  | { type: 'DELETE_TODO'; payload: number }
  | { type: 'RESTORE_ALL' }

// --- Initial data ---

const INITIAL_LIST: Todo[] = [
  { id: 1, text: 'Купить молоко',     done: false },
  { id: 2, text: 'Написать тесты',    done: true },
  { id: 3, text: 'Перечитать доку',   done: false },
  { id: 5, text: 'Позвонить клиенту', done: false },
  { id: 8, text: 'Закрыть задачу',    done: false },
]

function makeInitial(): TodosState {
  const byId: Record<number, Todo> = {}
  const ids: number[] = []
  for (const t of INITIAL_LIST) { byId[t.id] = t; ids.push(t.id) }
  return { byId, ids }
}

// --- Reducer ---

function todosReducer(state: TodosState = makeInitial(), action: AppAction): TodosState {
  switch (action.type) {
    case 'DELETE_TODO': {
      const id = action.payload
      if (!(id in state.byId)) return state
      const { [id]: _removed, ...rest } = state.byId
      return { byId: rest, ids: state.ids.filter(x => x !== id) }
    }
    case 'RESTORE_ALL': return makeInitial()
    default: return state
  }
}

const store = createStore(combineReducers({ todos: todosReducer }))

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — stale props / zombie children'
)

// --- ErrorBoundary ---

interface EBProps { children: ReactNode; label: string; onReset: () => void }
interface EBState { error: Error | null }

class ErrorBoundary extends Component<EBProps, EBState> {
  state: EBState = { error: null }

  static getDerivedStateFromError(error: Error): EBState { return { error } }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    con.error(`[${this.props.label}] ErrorBoundary поймал: ${error.message}`)
    void info
  }

  reset = () => {
    this.setState({ error: null })
    this.props.onReset()
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-banner">
          💥 ErrorBoundary: {this.state.error.message}
          <div style={{ marginTop: 8 }}>
            <button className="btn btn--sm" onClick={this.reset}>восстановить + сбросить</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ================================================
// Списки в двух версиях
// ================================================

function TodoItemUnsafe({ id }: { id: number }) {
  const todo = useSelector((state: RootState) => state.todos.byId[id])
  return (
    <div className="todo-row">
      <span className="todo-row__id">#{id}</span>
      <span className={`todo-row__text ${todo.done ? 'todo-row__done' : ''}`}>
        {todo.text}
      </span>
      <span>{todo.done ? '✔' : ''}</span>
    </div>
  )
}

function TodoItemSafe({ id }: { id: number }) {
  const todo = useSelector((state: RootState) => state.todos.byId[id])
  if (!todo) {
    con.warn(`[safe] TodoItem id=${id}: todo=undefined — рендерим null`)
    return null
  }
  return (
    <div className="todo-row">
      <span className="todo-row__id">#{id}</span>
      <span className={`todo-row__text ${todo.done ? 'todo-row__done' : ''}`}>
        {todo.text}
      </span>
      <span>{todo.done ? '✔' : ''}</span>
    </div>
  )
}

/**
 * Намеренно «застывший» список id: снимок при монтировании не обновляется при dispatch.
 * Иначе родитель сразу рисует меньше строк — дочерний TodoItem для удалённого id не
 * рендерится и не успевает получить undefined из byId (демо zombie child не срабатывает).
 */
function useStaleIdsSnapshot() {
  const liveIds = useSelector((state: RootState) => state.todos.ids)
  const snapRef = useRef<number[] | null>(null)
  if (snapRef.current === null) {
    snapRef.current = [...liveIds]
  }
  void liveIds
  return snapRef.current
}

function UnsafeList() {
  const ids = useStaleIdsSnapshot()
  return (
    <div className="todo-list">
      {ids.map(id => <TodoItemUnsafe key={id} id={id} />)}
    </div>
  )
}

function SafeList() {
  const ids = useStaleIdsSnapshot()
  return (
    <div className="todo-list">
      {ids.map(id => <TodoItemSafe key={id} id={id} />)}
    </div>
  )
}

// ================================================
// App
// ================================================

function App() {
  const dispatch = useDispatch()
  const [boundaryKey, setBoundaryKey] = useState(0)

  const onDelete = (id: number) => {
    con.log('')
    con.info(`📤 dispatch(DELETE_TODO · id=${id})`)
    con.log('   Ожидаем: byId[' + id + '] → undefined')
    dispatch({ type: 'DELETE_TODO', payload: id })
  }

  const onRestore = () => {
    con.log('')
    con.info('📤 dispatch(RESTORE_ALL) — возвращаем исходный список')
    dispatch({ type: 'RESTORE_ALL' })
  }

  const resetBoundary = () => setBoundaryKey(k => k + 1)

  return (
    <div>
      <div className="global-controls">
        <button className="btn btn--danger" onClick={() => onDelete(5)}>
          Delete id=5
        </button>
        <button className="btn btn--danger btn--sm" onClick={() => onDelete(1)}>
          Delete id=1
        </button>
        <button className="btn btn--danger btn--sm" onClick={() => onDelete(8)}>
          Delete id=8
        </button>
        <button className="btn btn--success" onClick={() => { onRestore(); resetBoundary() }}>
          Restore all
        </button>
      </div>

      <div className="demo-grid">
        <div className="demo-col demo-col--unsafe">
          <div className="demo-col__title">БЕЗ защиты: todo.text без проверки</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
            Селектор: <code>state.todos.byId[id]</code>. Список id — <strong>снимок при монтировании</strong>
            (намеренно не синхронизируется с store), иначе родитель сразу убирает строку и дочерний
            компонент не успевает увидеть <code>undefined</code>. Обращение к <code>.text</code> бросает
            TypeError, ловит <code>ErrorBoundary</code>.
          </div>
          <ErrorBoundary label="unsafe" onReset={resetBoundary} key={boundaryKey}>
            <UnsafeList />
          </ErrorBoundary>
        </div>

        <div className="demo-col demo-col--safe">
          <div className="demo-col__title">С защитой: if (!todo) return null</div>
          <div className="ok-banner">
            Перед обращением к <code>todo.text</code> — <code>if (!todo) return null</code>.
            Пропадающий элемент просто исчезает.
          </div>
          <SafeList key={boundaryKey} />
        </div>
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

con.info('Урок 53 — Stale Props и Zombie Children')
con.log('')
con.log('Сценарий: нажмите "Delete id=5". Список id — снимок при монтировании (демо zombie child).')
con.log('  Левая колонка (без защиты):')
con.log('    useSelector возвращает undefined → TodoItem падает на todo.text')
con.log('    ErrorBoundary ловит и показывает баннер.')
con.log('  Правая колонка (с защитой):')
con.log('    if (!todo) return null — компонент тихо исчезает до удаления родителем.')
con.log('')
con.log('Нажмите "Restore all" — все элементы возвращаются, ErrorBoundary сбрасывается.')
