import { legacy_createStore as createStore, combineReducers } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'
import { ConsolePanel } from '../shared/console-panel'

interface Todo {
  id: number
  text: string
  completed: boolean
}

interface FiltersState {
  status: string
  colors: string[]
}

interface AppState {
  todos: Todo[]
  filters: FiltersState
}

interface TodoAddedAction {
  type: 'todos/todoAdded'
  payload: string
}

interface TodoToggledAction {
  type: 'todos/todoToggled'
  payload: number
}

interface StatusChangedAction {
  type: 'filters/statusChanged'
  payload: string
}

interface ColorToggledAction {
  type: 'filters/colorToggled'
  payload: string
}

type AppAction =
  | TodoAddedAction
  | TodoToggledAction
  | StatusChangedAction
  | ColorToggledAction
  | { type: string }

let nextId = 4

const initialTodos: Todo[] = [
  { id: 1, text: 'Изучить reducer composition', completed: false },
  { id: 2, text: 'Понять combineReducers', completed: false },
  { id: 3, text: 'Разобрать слайсы', completed: true }
]

const initialFilters: FiltersState = {
  status: 'all',
  colors: []
}

const initialState: AppState = {
  todos: initialTodos,
  filters: initialFilters
}

function monolithicReducer(state: AppState = initialState, action: AppAction): AppState {
  switch (action.type) {
    case 'todos/todoAdded': {
      const newTodo: Todo = {
        id: nextId++,
        text: (action as TodoAddedAction).payload,
        completed: false
      }
      return {
        ...state,
        todos: [...state.todos, newTodo]
      }
    }
    case 'todos/todoToggled': {
      const toggleId = (action as TodoToggledAction).payload
      return {
        ...state,
        todos: state.todos.map(todo =>
          todo.id === toggleId
            ? { ...todo, completed: !todo.completed }
            : todo
        )
      }
    }
    case 'filters/statusChanged':
      return {
        ...state,
        filters: {
          ...state.filters,
          status: (action as StatusChangedAction).payload
        }
      }
    case 'filters/colorToggled': {
      const color = (action as ColorToggledAction).payload
      const hasColor = state.filters.colors.includes(color)
      return {
        ...state,
        filters: {
          ...state.filters,
          colors: hasColor
            ? state.filters.colors.filter(c => c !== color)
            : [...state.filters.colors, color]
        }
      }
    }
    default:
      return state
  }
}

function todosReducer(state: Todo[] = initialTodos, action: AppAction): Todo[] {
  switch (action.type) {
    case 'todos/todoAdded': {
      const newTodo: Todo = {
        id: nextId++,
        text: (action as TodoAddedAction).payload,
        completed: false
      }
      return [...state, newTodo]
    }
    case 'todos/todoToggled': {
      const toggleId = (action as TodoToggledAction).payload
      return state.map(todo =>
        todo.id === toggleId
          ? { ...todo, completed: !todo.completed }
          : todo
      )
    }
    default:
      return state
  }
}

function filtersReducer(state: FiltersState = initialFilters, action: AppAction): FiltersState {
  switch (action.type) {
    case 'filters/statusChanged':
      return { ...state, status: (action as StatusChangedAction).payload }
    case 'filters/colorToggled': {
      const color = (action as ColorToggledAction).payload
      const hasColor = state.colors.includes(color)
      return {
        ...state,
        colors: hasColor
          ? state.colors.filter(c => c !== color)
          : [...state.colors, color]
      }
    }
    default:
      return state
  }
}

const splitRootReducer = combineReducers({
  todos: todosReducer,
  filters: filtersReducer
})

let useSplit = false
let store = createStore(monolithicReducer)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)
consolePanel.info('Начальный режим: один большой reducer (monolithic)')
consolePanel.log('State:', store.getState())

function getFilteredTodos(state: AppState): Todo[] {
  const { status } = state.filters
  if (status === 'active') return state.todos.filter(t => !t.completed)
  if (status === 'completed') return state.todos.filter(t => t.completed)
  return state.todos
}

function render(): void {
  const state = store.getState() as AppState
  const listEl = document.getElementById('todo-list')!
  const emptyMsg = document.getElementById('todo-empty')!
  const stateDisplay = document.getElementById('state-display')!
  const modeLabel = document.getElementById('mode-label')!
  const codePanel = document.getElementById('code-comparison')!
  const countLabel = document.getElementById('shown-count')!

  stateDisplay.textContent = JSON.stringify(state, null, 2)

  modeLabel.textContent = useSplit
    ? '✓ Split Reducers (combineReducers)'
    : '◆ Один большой reducer (monolithic)'
  modeLabel.style.color = useSplit ? 'var(--success)' : 'var(--accent-orange)'

  if (useSplit) {
    codePanel.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div>
          <div style="color: var(--accent-cyan); font-size: 0.72rem; font-weight: 600; text-transform: uppercase; margin-bottom: 6px;">todosReducer — управляет todos</div>
          <div class="code-block" style="font-size: 0.75rem; margin: 0;">
<span class="kw">function</span> <span class="fn">todosReducer</span>(state: <span class="type">Todo</span>[] = [], action) {
  <span class="kw">switch</span> (action.<span class="prop">type</span>) {
    <span class="kw">case</span> <span class="str">'todos/todoAdded'</span>:
      <span class="kw">return</span> [...state, newTodo]
    <span class="kw">case</span> <span class="str">'todos/todoToggled'</span>:
      <span class="kw">return</span> state.<span class="fn">map</span>(...)
    <span class="kw">default</span>: <span class="kw">return</span> state
  }
}</div>
        </div>
        <div>
          <div style="color: var(--accent-orange); font-size: 0.72rem; font-weight: 600; text-transform: uppercase; margin-bottom: 6px;">filtersReducer — управляет filters</div>
          <div class="code-block" style="font-size: 0.75rem; margin: 0;">
<span class="kw">function</span> <span class="fn">filtersReducer</span>(state: <span class="type">FiltersState</span> = {}, action) {
  <span class="kw">switch</span> (action.<span class="prop">type</span>) {
    <span class="kw">case</span> <span class="str">'filters/statusChanged'</span>:
      <span class="kw">return</span> { ...state, <span class="prop">status</span>: action.<span class="prop">payload</span> }
    <span class="kw">case</span> <span class="str">'filters/colorToggled'</span>:
      <span class="kw">return</span> { ...state, <span class="prop">colors</span>: ... }
    <span class="kw">default</span>: <span class="kw">return</span> state
  }
}</div>
        </div>
      </div>
      <div style="margin-top: 8px; padding: 8px 12px; background: rgba(76,175,80,0.1); border-left: 3px solid var(--success); border-radius: 0 4px 4px 0; font-size: 0.78rem; color: var(--success);">
        Каждый reducer получает <strong>только свой слайс</strong> state и отвечает только за свою часть.
      </div>
    `
  } else {
    codePanel.innerHTML = `
      <div>
        <div style="color: var(--accent-orange); font-size: 0.72rem; font-weight: 600; text-transform: uppercase; margin-bottom: 6px;">monolithicReducer — один на всё</div>
        <div class="code-block" style="font-size: 0.75rem; margin: 0;">
<span class="kw">function</span> <span class="fn">monolithicReducer</span>(state: <span class="type">AppState</span> = initialState, action) {
  <span class="kw">switch</span> (action.<span class="prop">type</span>) {
    <span class="kw">case</span> <span class="str">'todos/todoAdded'</span>:
      <span class="kw">return</span> { ...state, <span class="prop">todos</span>: [...state.<span class="prop">todos</span>, newTodo] }
    <span class="kw">case</span> <span class="str">'todos/todoToggled'</span>:
      <span class="kw">return</span> { ...state, <span class="prop">todos</span>: state.<span class="prop">todos</span>.<span class="fn">map</span>(...) }
    <span class="kw">case</span> <span class="str">'filters/statusChanged'</span>:
      <span class="kw">return</span> { ...state, <span class="prop">filters</span>: { ...state.<span class="prop">filters</span>, <span class="prop">status</span>: ... } }
    <span class="kw">case</span> <span class="str">'filters/colorToggled'</span>:
      <span class="kw">return</span> { ...state, <span class="prop">filters</span>: { ...state.<span class="prop">filters</span>, <span class="prop">colors</span>: ... } }
    <span class="kw">default</span>: <span class="kw">return</span> state
  }
}</div>
      </div>
      <div style="margin-top: 8px; padding: 8px 12px; background: rgba(206,145,120,0.1); border-left: 3px solid var(--accent-orange); border-radius: 0 4px 4px 0; font-size: 0.78rem; color: var(--accent-orange);">
        Один reducer обрабатывает <strong>все</strong> экшены. Каждый case вручную собирает весь state через spread.
      </div>
    `
  }

  const filtered = getFilteredTodos(state)
  countLabel.textContent = `Показано: ${filtered.length} из ${state.todos.length}`

  if (filtered.length === 0) {
    listEl.innerHTML = ''
    emptyMsg.style.display = 'block'
    emptyMsg.textContent = state.todos.length === 0
      ? 'Нет задач'
      : `Нет задач со статусом «${state.filters.status}»`
  } else {
    emptyMsg.style.display = 'none'
    listEl.innerHTML = filtered.map((todo: Todo) => `
      <li style="padding: 6px 8px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px; cursor: pointer;"
          data-id="${todo.id}">
        <input type="checkbox" ${todo.completed ? 'checked' : ''}
               style="cursor: pointer; width: 14px; height: 14px;">
        <span style="font-size: 0.85rem; ${todo.completed ? 'text-decoration: line-through; color: var(--text-muted);' : 'color: var(--text-primary);'}">
          ${todo.text}
        </span>
      </li>
    `).join('')

    listEl.querySelectorAll('li').forEach(li => {
      li.addEventListener('click', (): void => {
        const id = Number(li.getAttribute('data-id'))
        store.dispatch({ type: 'todos/todoToggled', payload: id })
      })
    })
  }

  document.querySelectorAll('.filter-btn').forEach(btn => {
    const status = (btn as HTMLElement).getAttribute('data-status')!
    if (status === state.filters.status) {
      (btn as HTMLElement).style.borderColor = 'var(--accent)'
      ;(btn as HTMLElement).style.color = 'var(--accent)'
    } else {
      (btn as HTMLElement).style.borderColor = 'var(--border)'
      ;(btn as HTMLElement).style.color = 'var(--text-primary)'
    }
  })

  document.querySelectorAll('.color-btn').forEach(btn => {
    const color = (btn as HTMLElement).getAttribute('data-color')!
    const isActive = state.filters.colors.includes(color)
    ;(btn as HTMLElement).style.borderColor = isActive ? 'var(--accent)' : 'var(--border)'
    ;(btn as HTMLElement).style.fontWeight = isActive ? '700' : '400'
  })
}

store.subscribe(render)
render()

document.getElementById('btn-add-todo')!.addEventListener('click', (): void => {
  const input = document.getElementById('todo-input') as HTMLInputElement
  const text = input.value.trim()
  if (!text) return
  store.dispatch({ type: 'todos/todoAdded', payload: text })
  input.value = ''
  input.focus()
})

document.getElementById('todo-input')!.addEventListener('keydown', (e: KeyboardEvent): void => {
  if (e.key === 'Enter') {
    document.getElementById('btn-add-todo')!.click()
  }
})

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', (): void => {
    const status = (btn as HTMLElement).getAttribute('data-status')!
    store.dispatch({ type: 'filters/statusChanged', payload: status })
    consolePanel.log(`Фильтр → "${status}"${useSplit ? ' (через filtersReducer)' : ' (через monolithicReducer)'}`)
  })
})

document.querySelectorAll('.color-btn').forEach(btn => {
  btn.addEventListener('click', (): void => {
    const color = (btn as HTMLElement).getAttribute('data-color')!
    store.dispatch({ type: 'filters/colorToggled', payload: color })
  })
})

document.getElementById('btn-refactor')!.addEventListener('click', (): void => {
  const btnRefactor = document.getElementById('btn-refactor')!

  if (useSplit) {
    useSplit = false
    nextId = 4
    store = createStore(monolithicReducer)
    btnRefactor.textContent = 'Рефакторить → Split Reducers'
    consolePanel.warn('Откат: переключено на монолитный reducer')
  } else {
    useSplit = true
    nextId = 4
    store = createStore(splitRootReducer)
    btnRefactor.textContent = 'Вернуть → Monolithic Reducer'
    consolePanel.success('Рефакторинг: переключено на split reducers (combineReducers)')
  }

  consolePanel.log('Новый state:', store.getState())

  devtools.connectStore(store)
  store.subscribe(render)
  render()
})
