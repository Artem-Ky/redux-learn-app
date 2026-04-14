import { legacy_createStore as createStore } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'

interface TodosState {
  todos: string[]
}

interface TodoAction {
  type: string
  payload?: string
}

const initialState: TodosState = { todos: [] }

function todosReducer(
  state: TodosState = initialState,
  action: TodoAction
): TodosState {
  switch (action.type) {
    case 'todos/todoAdded':
      return { ...state, todos: [...state.todos, action.payload ?? ''] }
    case 'todos/allCleared':
      return { todos: [] }
    default:
      return state
  }
}

const store = createStore(todosReducer)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const todoInput = document.getElementById('todo-input') as HTMLInputElement
const todoListEl = document.getElementById('todo-list')!
const stateDisplayEl = document.getElementById('state-display')!
const actionDisplayEl = document.getElementById('action-display')!

function showAction(action: TodoAction): void {
  actionDisplayEl.textContent = JSON.stringify(action, null, 2)
}

function render(): void {
  const state = store.getState()
  stateDisplayEl.textContent = JSON.stringify(state, null, 2)

  if (state.todos.length === 0) {
    todoListEl.innerHTML = '<div style="color: var(--text-muted); font-style: italic;">Пока пусто — добавьте задачу выше</div>'
    return
  }

  todoListEl.innerHTML = state.todos.map((todo, i) => {
    const actionJson = JSON.stringify({ type: 'todos/todoAdded', payload: todo }, null, 2)
    return `
      <div style="
        background: var(--bg-panel);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 10px 14px;
        margin-bottom: 8px;
        display: flex;
        align-items: flex-start;
        gap: 12px;
      ">
        <span style="color: var(--accent); font-family: var(--font-mono); font-size: 0.8rem; flex-shrink: 0;">#${i + 1}</span>
        <div style="flex: 1;">
          <div style="color: var(--text-bright); margin-bottom: 6px;">${todo}</div>
          <pre style="
            color: var(--accent-orange);
            font-size: 0.75rem;
            background: rgba(0,0,0,0.3);
            padding: 6px 10px;
            border-radius: 3px;
            margin: 0;
            white-space: pre-wrap;
          ">${actionJson}</pre>
        </div>
      </div>
    `
  }).join('')
}

store.subscribe(render)
render()

document.getElementById('btn-add')!.addEventListener('click', (): void => {
  const text = todoInput.value.trim()
  if (!text) return

  const action: TodoAction = { type: 'todos/todoAdded', payload: text }
  showAction(action)
  store.dispatch(action)
  todoInput.value = ''
  todoInput.focus()
})

todoInput.addEventListener('keydown', (e: KeyboardEvent): void => {
  if (e.key === 'Enter') {
    document.getElementById('btn-add')!.click()
  }
})

document.getElementById('btn-clear')!.addEventListener('click', (): void => {
  const action: TodoAction = { type: 'todos/allCleared' }
  showAction(action)
  store.dispatch(action)
})
