import { legacy_createStore as createStore } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'
import { ConsolePanel } from '../shared/console-panel'

interface Todo {
  id: number
  text: string
  completed: boolean
}

interface TodoState {
  entities: Record<number, Todo>
  ids: number[]
  nextId: number
}

interface AddAction {
  type: 'todos/add'
  payload: Todo
}

interface ToggleAction {
  type: 'todos/toggle'
  payload: number
}

interface DeleteAction {
  type: 'todos/delete'
  payload: number
}

interface EditAction {
  type: 'todos/edit'
  payload: { id: number; text: string }
}

type TodoAction = AddAction | ToggleAction | DeleteAction | EditAction | { type: string }

const initialState: TodoState = {
  entities: {
    1: { id: 1, text: 'Изучить нормализацию', completed: true },
    2: { id: 2, text: 'Написать CRUD операции', completed: false },
    3: { id: 3, text: 'Сравнить с массивами', completed: false }
  },
  ids: [1, 2, 3],
  nextId: 4
}

function todosReducer(state: TodoState = initialState, action: TodoAction): TodoState {
  switch (action.type) {
    case 'todos/add': {
      const todo = (action as AddAction).payload
      return {
        ...state,
        entities: { ...state.entities, [todo.id]: todo },
        ids: [...state.ids, todo.id],
        nextId: state.nextId + 1
      }
    }
    case 'todos/toggle': {
      const id = (action as ToggleAction).payload
      const todo = state.entities[id]
      return {
        ...state,
        entities: {
          ...state.entities,
          [id]: { ...todo, completed: !todo.completed }
        }
      }
    }
    case 'todos/delete': {
      const id = (action as DeleteAction).payload
      const newEntities = { ...state.entities }
      delete newEntities[id]
      return {
        ...state,
        entities: newEntities,
        ids: state.ids.filter((i: number) => i !== id)
      }
    }
    case 'todos/edit': {
      const { id, text } = (action as EditAction).payload
      return {
        ...state,
        entities: {
          ...state.entities,
          [id]: { ...state.entities[id], text }
        }
      }
    }
    default:
      return state
  }
}

const store = createStore(todosReducer)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

const todoInput = document.getElementById('todo-input') as HTMLInputElement
const btnAdd = document.getElementById('btn-add')!
const todosDisplay = document.getElementById('todos-display')!
const stateDisplay = document.getElementById('state-display')!

let editingId: number | null = null

function render(): void {
  const state = store.getState() as TodoState

  if (state.ids.length === 0) {
    todosDisplay.innerHTML = `
      <span style="color: var(--text-muted); font-size: 0.85rem; padding: 12px; display: block;">
        Список пуст. Добавьте задачу ↑
      </span>`
  } else {
    todosDisplay.innerHTML = state.ids.map((id: number) => {
      const todo = state.entities[id]
      const isEditing = editingId === id

      if (isEditing) {
        return `
          <div style="display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-bottom: 1px solid var(--border);">
            <input
              type="text"
              class="edit-input"
              data-id="${id}"
              value="${todo.text}"
              style="flex: 1; padding: 6px 10px; background: var(--bg-input); border: 1px solid var(--accent); border-radius: var(--radius-sm); color: var(--text-bright); font-size: 0.85rem; font-family: var(--font-sans); outline: none;"
            />
            <button class="btn btn-save" data-id="${id}" style="padding: 4px 10px; font-size: 0.8rem;">💾</button>
            <button class="btn btn-cancel" data-id="${id}" style="padding: 4px 10px; font-size: 0.8rem;">✖</button>
          </div>`
      }

      return `
        <div style="display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-bottom: 1px solid var(--border);">
          <button class="btn-toggle" data-id="${id}" style="background: none; border: none; cursor: pointer; font-size: 1rem; padding: 2px;">
            ${todo.completed ? '✅' : '⬜'}
          </button>
          <span class="btn-edit-text" data-id="${id}" style="flex: 1; color: var(--text-bright); font-size: 0.85rem; cursor: pointer; ${todo.completed ? 'text-decoration: line-through; opacity: 0.5;' : ''}">
            ${todo.text}
          </span>
          <span style="color: var(--text-muted); font-family: var(--font-mono); font-size: 0.7rem;">#${id}</span>
          <button class="btn btn-edit" data-id="${id}" style="padding: 4px 10px; font-size: 0.75rem;">✏️</button>
          <button class="btn btn-delete" data-id="${id}" style="padding: 4px 10px; font-size: 0.75rem;">🗑️</button>
        </div>`
    }).join('')
  }

  stateDisplay.textContent = JSON.stringify(state, null, 2)
}

function attachListeners(): void {
  todosDisplay.addEventListener('click', (e: Event): void => {
    const target = e.target as HTMLElement

    const toggleBtn = target.closest('.btn-toggle') as HTMLElement | null
    if (toggleBtn) {
      const id = Number(toggleBtn.dataset.id)
      const state = store.getState() as TodoState
      const todo = state.entities[id]
      consolePanel.log(
        `🔄 TOGGLE: entities[${id}].completed = ${!todo.completed}`,
        'color: #dcdcaa'
      )
      consolePanel.log(
        `   { ...entities[${id}], completed: !completed }`,
        'color: #9cdcfe'
      )
      store.dispatch({ type: 'todos/toggle', payload: id })
      return
    }

    const deleteBtn = target.closest('.btn-delete') as HTMLElement | null
    if (deleteBtn) {
      const id = Number(deleteBtn.dataset.id)
      const state = store.getState() as TodoState
      const todo = state.entities[id]
      consolePanel.log(`🗑️ DELETE: "${todo.text}" (id: ${id})`, 'color: #f44747')
      consolePanel.log(`   delete entities[${id}] + ids.filter(i => i !== ${id})`, 'color: #9cdcfe')
      store.dispatch({ type: 'todos/delete', payload: id })
      return
    }

    const editBtn = target.closest('.btn-edit') as HTMLElement | null
    if (editBtn) {
      editingId = Number(editBtn.dataset.id)
      consolePanel.log(`✏️ EDIT mode: id ${editingId}`, 'color: #c586c0')
      render()
      const input = todosDisplay.querySelector(`.edit-input[data-id="${editingId}"]`) as HTMLInputElement | null
      if (input) input.focus()
      return
    }

    const saveBtn = target.closest('.btn-save') as HTMLElement | null
    if (saveBtn) {
      const id = Number(saveBtn.dataset.id)
      const input = todosDisplay.querySelector(`.edit-input[data-id="${id}"]`) as HTMLInputElement | null
      if (input && input.value.trim()) {
        consolePanel.log(`💾 EDIT SAVE: entities[${id}].text = "${input.value.trim()}"`, 'color: #4caf50')
        consolePanel.log(`   { ...entities[${id}], text: "${input.value.trim()}" }`, 'color: #9cdcfe')
        store.dispatch({ type: 'todos/edit', payload: { id, text: input.value.trim() } })
      }
      editingId = null
      render()
      return
    }

    const cancelBtn = target.closest('.btn-cancel') as HTMLElement | null
    if (cancelBtn) {
      consolePanel.log('✖ EDIT отменён', 'color: #999')
      editingId = null
      render()
      return
    }
  })

  todosDisplay.addEventListener('keydown', (e: KeyboardEvent): void => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement
      if (target.classList.contains('edit-input')) {
        const id = Number(target.dataset.id)
        const input = target as HTMLInputElement
        if (input.value.trim()) {
          consolePanel.log(`💾 EDIT SAVE (Enter): entities[${id}].text = "${input.value.trim()}"`, 'color: #4caf50')
          store.dispatch({ type: 'todos/edit', payload: { id, text: input.value.trim() } })
        }
        editingId = null
        render()
      }
    }
    if (e.key === 'Escape') {
      editingId = null
      render()
    }
  })
}

store.subscribe(render)
render()
attachListeners()

consolePanel.info('CRUD с нормализованным state')
consolePanel.log('')
consolePanel.log('Операции:', 'color: #dcdcaa')
consolePanel.log('  ➕ ADD    — entities[id] = todo, ids.push(id)', 'color: #4caf50')
consolePanel.log('  🔄 TOGGLE — { ...entities[id], completed: !completed }', 'color: #dcdcaa')
consolePanel.log('  ✏️ EDIT   — { ...entities[id], text: newText }', 'color: #c586c0')
consolePanel.log('  🗑️ DELETE — delete entities[id], ids.filter()', 'color: #f44747')
consolePanel.log('')

function addTodo(): void {
  const text = todoInput.value.trim()
  if (!text) return

  const state = store.getState() as TodoState
  const id = state.nextId
  const todo: Todo = { id, text, completed: false }

  consolePanel.log(`➕ ADD: "${text}" (id: ${id})`, 'color: #4caf50')
  consolePanel.log(`   entities[${id}] = { id: ${id}, text: "${text}", completed: false }`, 'color: #9cdcfe')
  consolePanel.log(`   ids: [...ids, ${id}]`, 'color: #9cdcfe')

  store.dispatch({ type: 'todos/add', payload: todo })
  todoInput.value = ''
  todoInput.focus()
}

btnAdd.addEventListener('click', addTodo)
todoInput.addEventListener('keydown', (e: KeyboardEvent): void => {
  if (e.key === 'Enter') addTodo()
})
