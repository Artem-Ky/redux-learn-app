import { legacy_createStore as createStore } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'

interface Todo {
  id: number
  text: string
  completed: boolean
}

type TodoState = Todo[]

interface TodoEditedAction {
  type: 'todos/todoEdited'
  payload: { id: number; text: string }
}

interface OtherAction {
  type: string
}

type TodoAction = TodoEditedAction | OtherAction

const initialState: TodoState = [
  { id: 1, text: 'Изучить Redux основы', completed: true },
  { id: 2, text: 'Написать первый reducer', completed: false },
  { id: 3, text: 'Разобраться с иммутабельностью', completed: false }
]

function todosReducer(state: TodoState = initialState, action: TodoAction): TodoState {
  switch (action.type) {
    case 'todos/todoEdited': {
      const { id, text } = (action as TodoEditedAction).payload
      return state.map(todo =>
        todo.id === id
          ? { ...todo, text }
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

let editingId: number | null = null

function saveEdit(id: number, inputEl: HTMLInputElement): void {
  const newText = inputEl.value.trim()
  if (newText && newText !== store.getState().find((t: Todo) => t.id === id)?.text) {
    store.dispatch({
      type: 'todos/todoEdited',
      payload: { id, text: newText }
    })
  }
  editingId = null
  render()
}

function render(): void {
  const state = store.getState()
  const listEl = document.getElementById('todo-list')!
  const stateDisplay = document.getElementById('state-display')!

  stateDisplay.textContent = JSON.stringify(state, null, 2)

  listEl.innerHTML = state.map((todo: Todo) => {
    if (editingId === todo.id) {
      return `
        <li style="padding: 8px 12px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px;"
            data-id="${todo.id}">
          <span style="color: var(--accent); font-family: var(--font-mono); font-size: 0.75rem;">#${todo.id}</span>
          <input type="text" class="edit-input" value="${todo.text}" data-id="${todo.id}"
                 style="flex: 1; background: var(--bg-input); border: 1px solid var(--accent); color: var(--text-bright); padding: 4px 8px; border-radius: 4px; font-size: 0.9rem;">
          <span style="color: var(--text-muted); font-size: 0.7rem;">Enter / Blur</span>
        </li>
      `
    }
    return `
      <li style="padding: 8px 12px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px; cursor: pointer;"
          data-id="${todo.id}">
        <span style="color: var(--accent); font-family: var(--font-mono); font-size: 0.75rem;">#${todo.id}</span>
        <span class="todo-text" data-id="${todo.id}"
              style="flex: 1; ${todo.completed ? 'text-decoration: line-through; color: var(--text-muted);' : 'color: var(--text-primary);'}">
          ${todo.text}
        </span>
        <span style="color: var(--text-muted); font-size: 0.7rem;">дважды кликните</span>
      </li>
    `
  }).join('')

  listEl.querySelectorAll('.todo-text').forEach(span => {
    span.addEventListener('dblclick', (): void => {
      const id = Number((span as HTMLElement).getAttribute('data-id'))
      editingId = id
      render()
    })
  })

  const editInput = listEl.querySelector('.edit-input') as HTMLInputElement | null
  if (editInput) {
    editInput.focus()
    editInput.setSelectionRange(editInput.value.length, editInput.value.length)

    const id = Number(editInput.getAttribute('data-id'))

    editInput.addEventListener('keydown', (e: KeyboardEvent): void => {
      if (e.key === 'Enter') {
        saveEdit(id, editInput)
      }
      if (e.key === 'Escape') {
        editingId = null
        render()
      }
    })

    editInput.addEventListener('blur', (): void => {
      saveEdit(id, editInput)
    })
  }
}

store.subscribe(render)
render()
