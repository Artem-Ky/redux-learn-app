import { legacy_createStore as createStore } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'

interface Todo {
  id: number
  text: string
  completed: boolean
}

type TodoState = Todo[]

interface TodoDeletedAction {
  type: 'todos/todoDeleted'
  payload: number
}

interface OtherAction {
  type: string
}

type TodoAction = TodoDeletedAction | OtherAction

const initialState: TodoState = [
  { id: 1, text: 'Изучить actions', completed: true },
  { id: 2, text: 'Написать reducer', completed: false },
  { id: 3, text: 'Настроить store', completed: false }
]

function todosReducer(state: TodoState = initialState, action: TodoAction): TodoState {
  switch (action.type) {
    case 'todos/todoDeleted': {
      const id = (action as TodoDeletedAction).payload
      return state.filter(todo => todo.id !== id)
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
  const countEl = document.getElementById('todo-count')!
  const stateDisplay = document.getElementById('state-display')!

  stateDisplay.textContent = JSON.stringify(state, null, 2)
  countEl.textContent = String(state.length)

  if (state.length === 0) {
    listEl.innerHTML = ''
    emptyMsg.style.display = 'block'
    return
  }

  emptyMsg.style.display = 'none'
  listEl.innerHTML = state.map((todo: Todo) => `
    <li style="padding: 8px 12px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px;"
        data-id="${todo.id}">
      <span style="color: var(--accent); font-family: var(--font-mono); font-size: 0.75rem;">#${todo.id}</span>
      <span style="color: var(--text-primary); ${todo.completed ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">
        ${todo.text}
      </span>
      <button class="btn-delete" data-id="${todo.id}"
              style="margin-left: auto; background: none; border: 1px solid var(--border); color: var(--accent-red); cursor: pointer; padding: 2px 8px; border-radius: 4px; font-size: 0.85rem; transition: background 0.15s;">
        ✕
      </button>
    </li>
  `).join('')

  listEl.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e: Event): void => {
      e.stopPropagation()
      const id = Number((btn as HTMLElement).getAttribute('data-id'))
      store.dispatch({ type: 'todos/todoDeleted', payload: id })
    })
  })
}

store.subscribe(render)
render()
