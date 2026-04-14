import { legacy_createStore as createStore } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'

interface Todo {
  id: number
  text: string
  completed: boolean
}

type TodoState = Todo[]

interface TodoAddedAction {
  type: 'todos/todoAdded'
  payload: string
}

interface OtherAction {
  type: string
}

type TodoAction = TodoAddedAction | OtherAction

let nextId = 1

const initialState: TodoState = []

function todosReducer(state: TodoState = initialState, action: TodoAction): TodoState {
  switch (action.type) {
    case 'todos/todoAdded': {
      const newTodo: Todo = {
        id: nextId++,
        text: (action as TodoAddedAction).payload,
        completed: false
      }
      return [...state, newTodo]
    }
    default:
      return state
  }
}

const store = createStore(todosReducer)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

function render(): void {
  const state = store.getState()
  const listEl = document.getElementById('todo-list')!
  const emptyMsg = document.getElementById('empty-msg')!
  const stateDisplay = document.getElementById('state-display')!

  stateDisplay.textContent = JSON.stringify(state, null, 2)

  if (state.length === 0) {
    listEl.innerHTML = ''
    emptyMsg.style.display = 'block'
    return
  }

  emptyMsg.style.display = 'none'
  listEl.innerHTML = state.map((todo: Todo) => `
    <li style="padding: 8px 12px; border-bottom: 1px solid var(--border); color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
      <span style="color: var(--accent); font-family: var(--font-mono); font-size: 0.75rem;">#${todo.id}</span>
      <span>${todo.text}</span>
      <span style="margin-left: auto; color: var(--text-muted); font-size: 0.75rem;">${todo.completed ? '✔' : '○'}</span>
    </li>
  `).join('')
}

store.subscribe(render)
render()

document.getElementById('btn-add')!.addEventListener('click', (): void => {
  const input = document.getElementById('todo-input') as HTMLInputElement
  const text = input.value.trim()
  if (!text) return

  store.dispatch({ type: 'todos/todoAdded', payload: text })
  input.value = ''
  input.focus()
})

document.getElementById('todo-input')!.addEventListener('keydown', (e: KeyboardEvent): void => {
  if (e.key === 'Enter') {
    document.getElementById('btn-add')!.click()
  }
})
