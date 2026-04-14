import { legacy_createStore as createStore } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'

interface Todo {
  id: number
  text: string
  completed: boolean
}

type TodoState = Todo[]

interface TodoToggledAction {
  type: 'todos/todoToggled'
  payload: number
}

interface OtherAction {
  type: string
}

type TodoAction = TodoToggledAction | OtherAction

const initialState: TodoState = [
  { id: 1, text: 'Изучить Redux', completed: false },
  { id: 2, text: 'Написать reducer', completed: true },
  { id: 3, text: 'Понять иммутабельность', completed: false }
]

function todosReducer(state: TodoState = initialState, action: TodoAction): TodoState {
  switch (action.type) {
    case 'todos/todoToggled': {
      const id = (action as TodoToggledAction).payload
      return state.map(todo =>
        todo.id === id
          ? { ...todo, completed: !todo.completed }
          : todo
      )
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
  const stateDisplay = document.getElementById('state-display')!

  stateDisplay.textContent = JSON.stringify(state, null, 2)

  listEl.innerHTML = state.map((todo: Todo) => `
    <li style="padding: 8px 12px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px; cursor: pointer;"
        data-id="${todo.id}">
      <input type="checkbox" ${todo.completed ? 'checked' : ''}
             style="cursor: pointer; width: 16px; height: 16px;">
      <span style="color: var(--accent); font-family: var(--font-mono); font-size: 0.75rem;">#${todo.id}</span>
      <span style="${todo.completed ? 'text-decoration: line-through; color: var(--text-muted);' : 'color: var(--text-primary);'}">
        ${todo.text}
      </span>
      <span style="margin-left: auto; font-size: 0.75rem; color: ${todo.completed ? 'var(--success)' : 'var(--text-muted)'};">
        ${todo.completed ? 'выполнено' : 'активно'}
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

store.subscribe(render)
render()
