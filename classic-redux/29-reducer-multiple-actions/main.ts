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

interface TodoToggledAction {
  type: 'todos/todoToggled'
  payload: number
}

interface TodoDeletedAction {
  type: 'todos/todoDeleted'
  payload: number
}

interface TodoEditedAction {
  type: 'todos/todoEdited'
  payload: { id: number; text: string }
}

interface AllCompletedAction {
  type: 'todos/allCompleted'
}

interface CompletedClearedAction {
  type: 'todos/completedCleared'
}

type TodoAction =
  | TodoAddedAction
  | TodoToggledAction
  | TodoDeletedAction
  | TodoEditedAction
  | AllCompletedAction
  | CompletedClearedAction
  | { type: string }

let nextId = 4

const initialState: TodoState = [
  { id: 1, text: 'Изучить actions и dispatch', completed: true },
  { id: 2, text: 'Написать reducer', completed: false },
  { id: 3, text: 'Разобрать иммутабельные обновления', completed: false }
]

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
    case 'todos/todoToggled': {
      const toggleId = (action as TodoToggledAction).payload
      return state.map(todo =>
        todo.id === toggleId
          ? { ...todo, completed: !todo.completed }
          : todo
      )
    }
    case 'todos/todoDeleted': {
      const deleteId = (action as TodoDeletedAction).payload
      return state.filter(todo => todo.id !== deleteId)
    }
    case 'todos/todoEdited': {
      const { id, text } = (action as TodoEditedAction).payload
      return state.map(todo =>
        todo.id === id ? { ...todo, text } : todo
      )
    }
    case 'todos/allCompleted':
      return state.map(todo => ({ ...todo, completed: true }))
    case 'todos/completedCleared':
      return state.filter(todo => !todo.completed)
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
  if (newText) {
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
  const emptyMsg = document.getElementById('empty-msg')!
  const stateDisplay = document.getElementById('state-display')!
  const todoCount = document.getElementById('todo-count')!
  const activeCount = document.getElementById('active-count')!
  const completedCount = document.getElementById('completed-count')!

  stateDisplay.textContent = JSON.stringify(state, null, 2)

  const active = state.filter((t: Todo) => !t.completed).length
  const completed = state.filter((t: Todo) => t.completed).length
  todoCount.textContent = String(state.length)
  activeCount.textContent = String(active)
  completedCount.textContent = String(completed)

  if (state.length === 0) {
    listEl.innerHTML = ''
    emptyMsg.style.display = 'block'
    return
  }

  emptyMsg.style.display = 'none'
  listEl.innerHTML = state.map((todo: Todo) => {
    if (editingId === todo.id) {
      return `
        <li style="padding: 8px 12px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px;">
          <span style="color: var(--accent); font-family: var(--font-mono); font-size: 0.75rem;">#${todo.id}</span>
          <input type="text" class="edit-input" value="${todo.text}" data-id="${todo.id}"
                 style="flex: 1; background: var(--bg-input); border: 1px solid var(--accent); color: var(--text-bright); padding: 4px 8px; border-radius: 4px;">
        </li>
      `
    }
    return `
      <li style="padding: 8px 12px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px;">
        <input type="checkbox" class="todo-checkbox" data-id="${todo.id}" ${todo.completed ? 'checked' : ''}
               style="cursor: pointer; width: 16px; height: 16px;">
        <span style="color: var(--accent); font-family: var(--font-mono); font-size: 0.75rem;">#${todo.id}</span>
        <span class="todo-text" data-id="${todo.id}"
              style="flex: 1; cursor: pointer; ${todo.completed ? 'text-decoration: line-through; color: var(--text-muted);' : 'color: var(--text-primary);'}">
          ${todo.text}
        </span>
        <button class="btn-delete" data-id="${todo.id}"
                style="background: none; border: 1px solid var(--border); color: var(--accent-red); cursor: pointer; padding: 2px 8px; border-radius: 4px; font-size: 0.85rem;">
          ✕
        </button>
      </li>
    `
  }).join('')

  listEl.querySelectorAll('.todo-checkbox').forEach(cb => {
    cb.addEventListener('change', (): void => {
      const id = Number((cb as HTMLElement).getAttribute('data-id'))
      store.dispatch({ type: 'todos/todoToggled', payload: id })
    })
  })

  listEl.querySelectorAll('.todo-text').forEach(span => {
    span.addEventListener('dblclick', (): void => {
      const id = Number((span as HTMLElement).getAttribute('data-id'))
      editingId = id
      render()
    })
  })

  listEl.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (): void => {
      const id = Number((btn as HTMLElement).getAttribute('data-id'))
      store.dispatch({ type: 'todos/todoDeleted', payload: id })
    })
  })

  const editInput = listEl.querySelector('.edit-input') as HTMLInputElement | null
  if (editInput) {
    editInput.focus()
    const id = Number(editInput.getAttribute('data-id'))

    editInput.addEventListener('keydown', (e: KeyboardEvent): void => {
      if (e.key === 'Enter') saveEdit(id, editInput)
      if (e.key === 'Escape') { editingId = null; render() }
    })
    editInput.addEventListener('blur', (): void => {
      saveEdit(id, editInput)
    })
  }
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

document.getElementById('btn-complete-all')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'todos/allCompleted' })
})

document.getElementById('btn-clear-completed')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'todos/completedCleared' })
})
