import { legacy_createStore as createStore, combineReducers } from 'redux'
import { createSelector } from 'reselect'
import { ConsolePanel } from '../shared/console-panel'

interface Todo {
  id: number
  text: string
  completed: boolean
}

type FilterValue = 'all' | 'active' | 'completed'

interface RootState {
  todos: Todo[]
  filter: FilterValue
}

type AppAction =
  | { type: 'todos/todoToggled'; payload: number }
  | { type: 'filter/filterChanged'; payload: FilterValue }
  | { type: 'noop' }

const initialTodos: Todo[] = [
  { id: 1, text: 'Изучить Redux store', completed: true },
  { id: 2, text: 'Написать reducer', completed: true },
  { id: 3, text: 'Создать selectors', completed: false },
  { id: 4, text: 'Добавить мемоизацию', completed: false },
  { id: 5, text: 'Построить цепочку', completed: false }
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

function filterReducer(state: FilterValue = 'all', action: AppAction): FilterValue {
  switch (action.type) {
    case 'filter/filterChanged':
      if (state === action.payload) return state
      return action.payload
    default:
      return state
  }
}

const rootReducer = combineReducers({
  todos: todosReducer,
  filter: filterReducer
})

const store = createStore(rootReducer)

const selectTodos = (state: RootState): Todo[] => state.todos
const selectFilter = (state: RootState): FilterValue => state.filter

let recomputeFilteredCount = 0
let recomputeIdsCount = 0

const selectFilteredTodos = createSelector(
  selectTodos,
  selectFilter,
  (todos, filter): Todo[] => {
    recomputeFilteredCount++
    switch (filter) {
      case 'active':
        return todos.filter(t => !t.completed)
      case 'completed':
        return todos.filter(t => t.completed)
      default:
        return todos
    }
  }
)

const selectFilteredTodoIds = createSelector(
  selectFilteredTodos,
  (todos): number[] => {
    recomputeIdsCount++
    return todos.map(t => t.id)
  }
)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)
consolePanel.info('Цепочка: selectFilteredTodos → selectFilteredTodoIds (двойная мемоизация)')

function render(): void {
  const state = store.getState() as RootState
  const filter = selectFilter(state)
  const filtered = selectFilteredTodos(state)
  const ids = selectFilteredTodoIds(state)

  document.getElementById('cur-filter')!.textContent = filter
  document.getElementById('recompute-filtered')!.textContent = String(recomputeFilteredCount)
  document.getElementById('recompute-ids')!.textContent = String(recomputeIdsCount)

  document.getElementById('filtered-result')!.textContent = JSON.stringify(
    filtered.map(t => ({ id: t.id, text: t.text, completed: t.completed })),
    null, 2
  )
  document.getElementById('ids-result')!.textContent = JSON.stringify(ids)

  consolePanel.log(`selectFilteredTodos: пересчётов = ${recomputeFilteredCount}`)
  consolePanel.log(`selectFilteredTodoIds: пересчётов = ${recomputeIdsCount}`)

  const buttons: Record<FilterValue, string> = {
    all: 'btn-all',
    active: 'btn-active',
    completed: 'btn-completed'
  }
  for (const [f, btnId] of Object.entries(buttons)) {
    document.getElementById(btnId)!.className = f === filter ? 'btn btn--accent' : 'btn'
  }
}

store.subscribe(render)
render()

document.getElementById('btn-all')!.addEventListener('click', (): void => {
  consolePanel.warn('— filter → "all" —')
  store.dispatch({ type: 'filter/filterChanged', payload: 'all' })
})

document.getElementById('btn-active')!.addEventListener('click', (): void => {
  consolePanel.warn('— filter → "active" —')
  store.dispatch({ type: 'filter/filterChanged', payload: 'active' })
})

document.getElementById('btn-completed')!.addEventListener('click', (): void => {
  consolePanel.warn('— filter → "completed" —')
  store.dispatch({ type: 'filter/filterChanged', payload: 'completed' })
})

document.getElementById('btn-noop')!.addEventListener('click', (): void => {
  consolePanel.warn('— Dispatch { type: "noop" } (ничего не меняется) —')
  store.dispatch({ type: 'noop' })
  const state = store.getState() as RootState
  selectFilteredTodos(state)
  selectFilteredTodoIds(state)
  consolePanel.success(`После noop: filteredTodos пересчётов = ${recomputeFilteredCount}, ids пересчётов = ${recomputeIdsCount}`)
  document.getElementById('recompute-filtered')!.textContent = String(recomputeFilteredCount)
  document.getElementById('recompute-ids')!.textContent = String(recomputeIdsCount)
})

document.getElementById('btn-toggle')!.addEventListener('click', (): void => {
  consolePanel.warn('— Toggle todo #1 (данные МЕНЯЮТСЯ) —')
  store.dispatch({ type: 'todos/todoToggled', payload: 1 })
})
