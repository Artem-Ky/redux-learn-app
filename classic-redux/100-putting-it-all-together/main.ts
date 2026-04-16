import { legacy_createStore as createStore, applyMiddleware, combineReducers, Middleware, AnyAction, Dispatch } from 'redux'
import { thunk, ThunkDispatch } from 'redux-thunk'
import { createSelector } from 'reselect'
import { produce } from 'immer'
import { DevToolsPanel } from '../shared/devtools-panel'
import { ConsolePanel } from '../shared/console-panel'

// ═══════════════════════════════════════════════
//  INTERFACES
// ═══════════════════════════════════════════════

type TodoColor = '' | 'red' | 'blue' | 'green'
type StatusFilter = 'all' | 'active' | 'completed'
type UiStatus = 'idle' | 'loading' | 'error'

interface Todo {
  id: number
  text: string
  completed: boolean
  color: TodoColor
}

interface TodosState {
  entities: Record<number, Todo>
  ids: number[]
  nextId: number
}

interface FiltersState {
  status: StatusFilter
  colors: TodoColor[]
}

interface UiState {
  status: UiStatus
  error: string | null
}

interface RootState {
  todos: TodosState
  filters: FiltersState
  ui: UiState
}

// ─── Action types ───

interface TodoAddedAction { type: 'todos/added'; payload: string }
interface TodoToggledAction { type: 'todos/toggled'; payload: number }
interface TodoDeletedAction { type: 'todos/deleted'; payload: number }
interface TodoEditedAction { type: 'todos/edited'; payload: { id: number; text: string } }
interface TodoColorChangedAction { type: 'todos/colorChanged'; payload: { id: number; color: TodoColor } }
interface TodosAllCompletedAction { type: 'todos/allCompleted' }
interface TodosCompletedClearedAction { type: 'todos/completedCleared' }
interface TodosLoadedAction { type: 'todos/loaded'; payload: Todo[] }

interface FilterStatusChangedAction { type: 'filters/statusChanged'; payload: StatusFilter }
interface FilterColorToggledAction { type: 'filters/colorToggled'; payload: TodoColor }

interface UiStatusSetAction { type: 'ui/statusSet'; payload: UiStatus }
interface UiErrorSetAction { type: 'ui/errorSet'; payload: string | null }

type TodoAction =
  | TodoAddedAction | TodoToggledAction | TodoDeletedAction
  | TodoEditedAction | TodoColorChangedAction
  | TodosAllCompletedAction | TodosCompletedClearedAction | TodosLoadedAction
type FilterAction = FilterStatusChangedAction | FilterColorToggledAction
type UiAction = UiStatusSetAction | UiErrorSetAction

type AppAction = TodoAction | FilterAction | UiAction | { type: string }

// ═══════════════════════════════════════════════
//  ACTION CREATORS
// ═══════════════════════════════════════════════

const todoAdded = (text: string): TodoAddedAction =>
  ({ type: 'todos/added', payload: text })

const todoToggled = (id: number): TodoToggledAction =>
  ({ type: 'todos/toggled', payload: id })

const todoDeleted = (id: number): TodoDeletedAction =>
  ({ type: 'todos/deleted', payload: id })

const todoEdited = (id: number, text: string): TodoEditedAction =>
  ({ type: 'todos/edited', payload: { id, text } })

const todoColorChanged = (id: number, color: TodoColor): TodoColorChangedAction =>
  ({ type: 'todos/colorChanged', payload: { id, color } })

const allCompleted = (): TodosAllCompletedAction =>
  ({ type: 'todos/allCompleted' })

const completedCleared = (): TodosCompletedClearedAction =>
  ({ type: 'todos/completedCleared' })

const filterStatusChanged = (status: StatusFilter): FilterStatusChangedAction =>
  ({ type: 'filters/statusChanged', payload: status })

const filterColorToggled = (color: TodoColor): FilterColorToggledAction =>
  ({ type: 'filters/colorToggled', payload: color })

// ═══════════════════════════════════════════════
//  REDUCERS (with Immer produce)
// ═══════════════════════════════════════════════

const todosInitial: TodosState = { entities: {}, ids: [], nextId: 1 }

const todosReducer = produce((draft: TodosState, action: AppAction) => {
  switch (action.type) {
    case 'todos/added': {
      const text = (action as TodoAddedAction).payload
      const id = draft.nextId
      draft.entities[id] = { id, text, completed: false, color: '' }
      draft.ids.push(id)
      draft.nextId++
      break
    }
    case 'todos/toggled': {
      const id = (action as TodoToggledAction).payload
      const todo = draft.entities[id]
      if (todo) todo.completed = !todo.completed
      break
    }
    case 'todos/deleted': {
      const id = (action as TodoDeletedAction).payload
      delete draft.entities[id]
      draft.ids = draft.ids.filter(i => i !== id)
      break
    }
    case 'todos/edited': {
      const { id, text } = (action as TodoEditedAction).payload
      const todo = draft.entities[id]
      if (todo) todo.text = text
      break
    }
    case 'todos/colorChanged': {
      const { id, color } = (action as TodoColorChangedAction).payload
      const todo = draft.entities[id]
      if (todo) todo.color = color
      break
    }
    case 'todos/allCompleted': {
      for (const id of draft.ids) {
        draft.entities[id].completed = true
      }
      break
    }
    case 'todos/completedCleared': {
      const completedIds = draft.ids.filter(id => draft.entities[id].completed)
      for (const id of completedIds) {
        delete draft.entities[id]
      }
      draft.ids = draft.ids.filter(id => !completedIds.includes(id))
      break
    }
    case 'todos/loaded': {
      const todos = (action as TodosLoadedAction).payload
      for (const todo of todos) {
        draft.entities[todo.id] = todo
        if (!draft.ids.includes(todo.id)) draft.ids.push(todo.id)
      }
      if (todos.length > 0) {
        draft.nextId = Math.max(...todos.map(t => t.id)) + 1
      }
      break
    }
  }
}, todosInitial)

const filtersInitial: FiltersState = { status: 'all', colors: [] }

const filtersReducer = produce((draft: FiltersState, action: AppAction) => {
  switch (action.type) {
    case 'filters/statusChanged':
      draft.status = (action as FilterStatusChangedAction).payload
      break
    case 'filters/colorToggled': {
      const color = (action as FilterColorToggledAction).payload
      const idx = draft.colors.indexOf(color)
      if (idx === -1) {
        draft.colors.push(color)
      } else {
        draft.colors.splice(idx, 1)
      }
      break
    }
  }
}, filtersInitial)

const uiInitial: UiState = { status: 'idle', error: null }

const uiReducer = produce((draft: UiState, action: AppAction) => {
  switch (action.type) {
    case 'ui/statusSet':
      draft.status = (action as UiStatusSetAction).payload
      break
    case 'ui/errorSet':
      draft.error = (action as UiErrorSetAction).payload
      break
  }
}, uiInitial)

const rootReducer = combineReducers({
  todos: todosReducer,
  filters: filtersReducer,
  ui: uiReducer
})

// ═══════════════════════════════════════════════
//  SELECTORS (Reselect)
// ═══════════════════════════════════════════════

const selectTodosState = (state: RootState): TodosState => state.todos
const selectFiltersState = (state: RootState): FiltersState => state.filters
const selectUiState = (state: RootState): UiState => state.ui

const selectAllTodos = createSelector(
  [selectTodosState],
  (todosState: TodosState): Todo[] => todosState.ids.map(id => todosState.entities[id])
)

const selectFilteredTodos = createSelector(
  [selectAllTodos, selectFiltersState],
  (todos: Todo[], filters: FiltersState): Todo[] => {
    let result = todos

    if (filters.status === 'active') {
      result = result.filter(t => !t.completed)
    } else if (filters.status === 'completed') {
      result = result.filter(t => t.completed)
    }

    if (filters.colors.length > 0) {
      result = result.filter(t => t.color !== '' && filters.colors.includes(t.color))
    }

    return result
  }
)

const selectTodoCount = createSelector(
  [selectFilteredTodos],
  (todos: Todo[]): number => todos.length
)

const selectActiveTodoCount = createSelector(
  [selectAllTodos],
  (todos: Todo[]): number => todos.filter(t => !t.completed).length
)

// ═══════════════════════════════════════════════
//  MIDDLEWARE
// ═══════════════════════════════════════════════

const loggerMiddleware: Middleware = (storeAPI) => (next) => (action: unknown): unknown => {
  const act = action as AnyAction
  if (typeof action === 'function') return next(action)
  consolePanel.log(`[dispatch] ${act.type}${act.payload !== undefined ? ` | payload: ${JSON.stringify(act.payload)}` : ''}`)
  const result = next(action)
  return result
}

// ═══════════════════════════════════════════════
//  THUNKS
// ═══════════════════════════════════════════════

function loadTodosThunk(): (dispatch: Dispatch<AppAction>) => void {
  return (dispatch: Dispatch<AppAction>): void => {
    dispatch({ type: 'ui/statusSet', payload: 'loading' })
    dispatch({ type: 'ui/errorSet', payload: null })
    consolePanel.info('Загрузка todos...')

    setTimeout((): void => {
      try {
        const serverTodos: Todo[] = [
          { id: 1, text: 'Изучить Actions и Reducers', completed: true, color: 'green' },
          { id: 2, text: 'Понять Middleware и Thunks', completed: true, color: 'blue' },
          { id: 3, text: 'Освоить Reselect и мемоизацию', completed: false, color: 'blue' },
          { id: 4, text: 'Разобраться с Immer', completed: false, color: 'red' },
          { id: 5, text: 'Перейти на Redux Toolkit', completed: false, color: '' }
        ]
        dispatch({ type: 'todos/loaded', payload: serverTodos })
        dispatch({ type: 'ui/statusSet', payload: 'idle' })
        consolePanel.success(`Загружено ${serverTodos.length} задач`)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        dispatch({ type: 'ui/statusSet', payload: 'error' })
        dispatch({ type: 'ui/errorSet', payload: msg })
        consolePanel.error(`Ошибка загрузки: ${msg}`)
      }
    }, 1000)
  }
}

function saveTodosThunk(): (dispatch: Dispatch<AppAction>, getState: () => RootState) => void {
  return (dispatch: Dispatch<AppAction>, getState: () => RootState): void => {
    dispatch({ type: 'ui/statusSet', payload: 'loading' })
    consolePanel.info('Сохранение todos...')

    setTimeout((): void => {
      const state = getState()
      const todos = selectAllTodos(state)
      dispatch({ type: 'ui/statusSet', payload: 'idle' })
      consolePanel.success(`Сохранено ${todos.length} задач (симуляция)`)
    }, 800)
  }
}

// ═══════════════════════════════════════════════
//  STORE
// ═══════════════════════════════════════════════

const store = createStore(rootReducer, applyMiddleware(thunk as Middleware, loggerMiddleware))

type AppDispatch = ThunkDispatch<RootState, unknown, AppAction>

// ═══════════════════════════════════════════════
//  UI PANELS
// ═══════════════════════════════════════════════

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

// ─── DOM refs ───

const inputTodo = document.getElementById('input-todo') as HTMLInputElement
const btnAdd = document.getElementById('btn-add')!
const btnLoad = document.getElementById('btn-load')!
const btnSave = document.getElementById('btn-save')!
const btnCompleteAll = document.getElementById('btn-complete-all')!
const btnClearCompleted = document.getElementById('btn-clear-completed')!
const todoListEl = document.getElementById('todo-list')!
const todoCountEl = document.getElementById('todo-count')!
const errorBanner = document.getElementById('error-banner')!

const filterBtns = document.querySelectorAll<HTMLButtonElement>('.todo-filter-btn')
const colorTags = document.querySelectorAll<HTMLSpanElement>('.color-tag')

const COLOR_MAP: Record<string, string> = {
  red: '#f44747',
  blue: '#569cd6',
  green: '#4caf50'
}

const COLORS_CYCLE: TodoColor[] = ['', 'red', 'blue', 'green']

// ═══════════════════════════════════════════════
//  RENDER
// ═══════════════════════════════════════════════

function render(): void {
  const state = store.getState() as RootState
  const uiState = selectUiState(state)
  const filteredTodos = selectFilteredTodos(state)
  const totalCount = selectTodoCount(state)
  const activeCount = selectActiveTodoCount(state)

  // Error banner
  if (uiState.error) {
    errorBanner.textContent = uiState.error
    errorBanner.style.display = 'block'
  } else {
    errorBanner.style.display = 'none'
  }

  // Loading
  if (uiState.status === 'loading') {
    todoListEl.innerHTML = `
      <div class="loading-overlay">
        <div class="spinner"></div>
        <span>Загрузка...</span>
      </div>
    `
    todoCountEl.textContent = 'Загрузка...'
    return
  }

  // Empty state
  if (filteredTodos.length === 0) {
    const allTodos = selectAllTodos(state)
    if (allTodos.length === 0) {
      todoListEl.innerHTML = `
        <div style="color: var(--text-muted); padding: 32px; text-align: center;">
          Список пуст — добавьте задачу или нажмите «Загрузить»
        </div>
      `
    } else {
      todoListEl.innerHTML = `
        <div style="color: var(--text-muted); padding: 32px; text-align: center;">
          Нет задач, подходящих под текущий фильтр
        </div>
      `
    }
    todoCountEl.textContent = `${activeCount} ${pluralize(activeCount)} осталось`
    return
  }

  // Render todos
  todoListEl.innerHTML = filteredTodos.map(todo => {
    const colorDot = todo.color
      ? `<span class="todo-item__color-dot" data-cycle-color="${todo.id}" style="background: ${COLOR_MAP[todo.color] || 'transparent'};" title="Клик = сменить цвет"></span>`
      : `<span class="todo-item__color-dot" data-cycle-color="${todo.id}" style="background: var(--bg-active); border: 1px dashed var(--text-muted);" title="Клик = назначить цвет"></span>`

    return `
      <div class="todo-item" data-id="${todo.id}">
        <input type="checkbox" class="todo-item__checkbox" data-toggle="${todo.id}" ${todo.completed ? 'checked' : ''}>
        <span class="todo-item__text ${todo.completed ? 'todo-item__text--completed' : ''}" data-edit="${todo.id}">${escapeHtml(todo.text)}</span>
        ${colorDot}
        <button class="todo-item__delete" data-delete="${todo.id}" title="Удалить">×</button>
      </div>
    `
  }).join('')

  todoCountEl.textContent = `${activeCount} ${pluralize(activeCount)} осталось (показано: ${totalCount})`

  // Bind events
  todoListEl.querySelectorAll<HTMLInputElement>('[data-toggle]').forEach(el => {
    el.addEventListener('change', (): void => {
      const id = parseInt(el.dataset.toggle!, 10)
      store.dispatch(todoToggled(id))
    })
  })

  todoListEl.querySelectorAll<HTMLButtonElement>('[data-delete]').forEach(el => {
    el.addEventListener('click', (): void => {
      const id = parseInt(el.dataset.delete!, 10)
      store.dispatch(todoDeleted(id))
    })
  })

  todoListEl.querySelectorAll<HTMLSpanElement>('[data-edit]').forEach(el => {
    el.addEventListener('dblclick', (): void => {
      const id = parseInt(el.dataset.edit!, 10)
      startEditing(el, id)
    })
  })

  todoListEl.querySelectorAll<HTMLSpanElement>('[data-cycle-color]').forEach(el => {
    el.addEventListener('click', (): void => {
      const id = parseInt(el.dataset.cycleColor!, 10)
      cycleColor(id)
    })
  })

  // Filter highlights
  const currentStatus = state.filters.status
  filterBtns.forEach(btn => {
    btn.classList.toggle('todo-filter-btn--active', btn.dataset.filter === currentStatus)
  })

  const activeColors = state.filters.colors
  colorTags.forEach(tag => {
    tag.classList.toggle('color-tag--active', activeColors.includes(tag.dataset.color as TodoColor))
  })
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function pluralize(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 19) return 'задач'
  if (mod10 === 1) return 'задача'
  if (mod10 >= 2 && mod10 <= 4) return 'задачи'
  return 'задач'
}

function startEditing(el: HTMLSpanElement, id: number): void {
  const state = store.getState() as RootState
  const todo = state.todos.entities[id]
  if (!todo) return

  el.classList.add('todo-item__text--editing')
  el.contentEditable = 'true'
  el.focus()

  const finishEdit = (): void => {
    el.contentEditable = 'false'
    el.classList.remove('todo-item__text--editing')
    const newText = el.textContent?.trim() || ''
    if (newText && newText !== todo.text) {
      store.dispatch(todoEdited(id, newText))
    } else {
      el.textContent = todo.text
    }
  }

  el.addEventListener('blur', finishEdit, { once: true })
  el.addEventListener('keydown', (e: KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      el.blur()
    }
    if (e.key === 'Escape') {
      el.textContent = todo.text
      el.blur()
    }
  })
}

function cycleColor(id: number): void {
  const state = store.getState() as RootState
  const todo = state.todos.entities[id]
  if (!todo) return
  const currentIdx = COLORS_CYCLE.indexOf(todo.color)
  const nextColor = COLORS_CYCLE[(currentIdx + 1) % COLORS_CYCLE.length]
  store.dispatch(todoColorChanged(id, nextColor))
}

// ═══════════════════════════════════════════════
//  EVENT LISTENERS
// ═══════════════════════════════════════════════

store.subscribe(render)
render()

// Add todo
btnAdd.addEventListener('click', (): void => {
  const text = inputTodo.value.trim()
  if (!text) return
  store.dispatch(todoAdded(text))
  inputTodo.value = ''
  inputTodo.focus()
})

inputTodo.addEventListener('keydown', (e: KeyboardEvent): void => {
  if (e.key === 'Enter') btnAdd.click()
})

// Load & Save thunks
btnLoad.addEventListener('click', (): void => {
  ;(store.dispatch as AppDispatch)(loadTodosThunk() as unknown as AnyAction)
})

btnSave.addEventListener('click', (): void => {
  ;(store.dispatch as AppDispatch)(saveTodosThunk() as unknown as AnyAction)
})

// Bulk actions
btnCompleteAll.addEventListener('click', (): void => {
  store.dispatch(allCompleted())
})

btnClearCompleted.addEventListener('click', (): void => {
  store.dispatch(completedCleared())
})

// Filter: status tabs
filterBtns.forEach(btn => {
  btn.addEventListener('click', (): void => {
    const status = btn.dataset.filter as StatusFilter
    store.dispatch(filterStatusChanged(status))
  })
})

// Filter: color toggles
colorTags.forEach(tag => {
  tag.addEventListener('click', (): void => {
    const color = tag.dataset.color as TodoColor
    store.dispatch(filterColorToggled(color))
  })
})

// ═══════════════════════════════════════════════
//  INIT CONSOLE
// ═══════════════════════════════════════════════

consolePanel.info('Todo Manager — итоговый проект (100/100)')
consolePanel.log('')
consolePanel.log('Все концепции классического Redux в одном приложении:')
consolePanel.log('  • Normalized state (entities + ids)')
consolePanel.log('  • combineReducers (todos / filters / ui)')
consolePanel.log('  • Immer produce в каждом reducer')
consolePanel.log('  • Action creators')
consolePanel.log('  • Thunks (загрузка и сохранение)')
consolePanel.log('  • Reselect (мемоизированные селекторы)')
consolePanel.log('  • Logger middleware')
consolePanel.log('  • DevTools panel')
consolePanel.log('')
consolePanel.success('Поздравляем с завершением курса!')
consolePanel.log('')
