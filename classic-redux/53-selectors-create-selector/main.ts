import { legacy_createStore as createStore, combineReducers } from 'redux'
import { createSelector } from 'reselect'
import { ConsolePanel } from '../shared/console-panel'

interface Todo {
  id: number
  text: string
  completed: boolean
}

interface RootState {
  todos: Todo[]
}

type AppAction =
  | { type: 'todos/todoToggled'; payload: number }
  | { type: 'noop' }

const initialTodos: Todo[] = [
  { id: 1, text: 'Изучить Redux store', completed: true },
  { id: 2, text: 'Написать reducer', completed: false },
  { id: 3, text: 'Создать selectors', completed: false }
]

function todosReducer(state: Todo[] = initialTodos, action: AppAction): Todo[] {
  switch (action.type) {
    case 'todos/todoToggled':
      return state.map(todo =>
        todo.id === action.payload
          ? { ...todo, completed: !todo.completed }
          : todo
      )
    default:
      return state
  }
}

const rootReducer = combineReducers({
  todos: todosReducer
})

const store = createStore(rootReducer)

const selectTodos = (state: RootState): Todo[] => state.todos

let outputCallCount = 0

const selectTodoIds = createSelector(
  selectTodos,
  (todos): number[] => {
    outputCallCount++
    return todos.map(t => t.id)
  }
)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)
consolePanel.info('createSelector: мемоизированный selectTodoIds')

let callCount = 0
let prevResult: number[] | null = null

function renderTodoList(): void {
  const state = store.getState() as RootState
  const listEl = document.getElementById('todo-list')!

  listEl.innerHTML = state.todos.map((todo: Todo) => `
    <li style="padding: 6px 8px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px;">
      <span style="color: var(--accent); font-family: var(--font-mono); font-size: 0.75rem;">#${todo.id}</span>
      <span style="flex: 1; font-size: 0.85rem; ${todo.completed ? 'text-decoration: line-through; color: var(--text-muted);' : 'color: var(--text-primary);'}">
        ${todo.text}
      </span>
      <span style="color: ${todo.completed ? 'var(--accent-green)' : 'var(--accent-orange)'}; font-size: 0.75rem;">
        ${todo.completed ? '✔ done' : '○ active'}
      </span>
    </li>
  `).join('')
}

function checkEquality(): void {
  const state = store.getState() as RootState
  callCount++

  const newResult = selectTodoIds(state)

  document.getElementById('ids-result')!.textContent = JSON.stringify(newResult)
  document.getElementById('recompute-count')!.textContent = String(outputCallCount)

  const equalityEl = document.getElementById('equality-result')!

  if (prevResult !== null) {
    const isEqual = prevResult === newResult
    equalityEl.textContent = String(isEqual)
    equalityEl.style.color = isEqual ? 'var(--accent-green)' : 'var(--accent-red)'

    consolePanel.log(`Вызов #${callCount}: selectTodoIds(state) → [${newResult.join(', ')}]`)
    if (isEqual) {
      consolePanel.success(`prevResult === newResult → true (мемоизация! та же ссылка)`)
    } else {
      consolePanel.warn(`prevResult === newResult → false (input изменился, пересчёт)`)
    }
    consolePanel.log(`Output selector вызвался ${outputCallCount} раз`)
  } else {
    equalityEl.textContent = '—'
    equalityEl.style.color = 'var(--text-muted)'
    consolePanel.log(`Вызов #${callCount}: первый вызов selectTodoIds → [${newResult.join(', ')}]`)
  }

  prevResult = newResult
}

renderTodoList()
checkEquality()

document.getElementById('btn-no-change')!.addEventListener('click', (): void => {
  consolePanel.warn('— Dispatch { type: "noop" } (данные НЕ меняются) —')
  store.dispatch({ type: 'noop' })
  renderTodoList()
  checkEquality()
})

document.getElementById('btn-toggle')!.addEventListener('click', (): void => {
  consolePanel.warn('— Dispatch todos/todoToggled #1 (данные МЕНЯЮТСЯ) —')
  store.dispatch({ type: 'todos/todoToggled', payload: 1 })
  renderTodoList()
  checkEquality()
})
