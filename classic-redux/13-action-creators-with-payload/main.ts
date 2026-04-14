import { legacy_createStore as createStore } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'

interface Todo {
  id: number
  text: string
  completed: boolean
}

type TodosState = Todo[]

interface TodoAction {
  type: string
  payload: string
}

const initialState: TodosState = []

function todoAdded(text: string): TodoAction {
  return {
    type: 'todos/todoAdded',
    payload: text
  }
}

function todosReducer(
  state: TodosState = initialState,
  action: TodoAction
): TodosState {
  switch (action.type) {
    case 'todos/todoAdded':
      return [...state, {
        id: state.length + 1,
        text: action.payload,
        completed: false
      }]
    default:
      return state
  }
}

const store = createStore(todosReducer)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

function render(): void {
  const state = store.getState()
  document.getElementById('state-display')!.textContent = JSON.stringify(state, null, 2)

  const listEl = document.getElementById('todo-list')!
  if (state.length === 0) {
    listEl.textContent = 'Пока пусто'
  } else {
    listEl.innerHTML = state.map((todo: Todo) =>
      `<div style="padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
        #${todo.id} — ${todo.text}
      </div>`
    ).join('')
  }
}

function showAction(action: TodoAction): void {
  document.getElementById('action-display')!.textContent = JSON.stringify(action, null, 2)
}

store.subscribe(render)
render()

document.getElementById('btn-add')!.addEventListener('click', (): void => {
  const input = document.getElementById('todo-input') as HTMLInputElement
  const text = input.value.trim()
  if (!text) return

  const action = todoAdded(text)
  showAction(action)
  store.dispatch(action)
  input.value = ''
  input.focus()
})

const todoInput = document.getElementById('todo-input') as HTMLInputElement
todoInput.addEventListener('keydown', (e: KeyboardEvent): void => {
  if (e.key === 'Enter') {
    document.getElementById('btn-add')!.click()
  }
})
