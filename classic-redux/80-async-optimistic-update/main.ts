import { legacy_createStore as createStore, applyMiddleware } from 'redux'
import { thunk } from 'redux-thunk'
import { DevToolsPanel } from '../shared/devtools-panel'
import { ConsolePanel } from '../shared/console-panel'

interface Todo {
  id: number
  text: string
  completed: boolean
}

interface AppState {
  todos: Todo[]
  syncing: number[]
}

interface TodoToggledAction {
  type: 'todo/toggled'
  payload: number
}

interface TodoRollbackAction {
  type: 'todo/rollback'
  payload: Todo[]
}

interface SyncStartAction {
  type: 'sync/start'
  payload: number
}

interface SyncEndAction {
  type: 'sync/end'
  payload: number
}

type AppAction =
  | TodoToggledAction | TodoRollbackAction
  | SyncStartAction | SyncEndAction
  | { type: string }

const initialState: AppState = {
  todos: [
    { id: 1, text: 'Изучить Redux Thunk', completed: true },
    { id: 2, text: 'Понять optimistic updates', completed: false },
    { id: 3, text: 'Реализовать rollback', completed: false },
    { id: 4, text: 'Написать тесты', completed: false }
  ],
  syncing: []
}

function todoReducer(state: AppState = initialState, action: AppAction): AppState {
  switch (action.type) {
    case 'todo/toggled':
      return {
        ...state,
        todos: state.todos.map((t: Todo) =>
          t.id === (action as TodoToggledAction).payload
            ? { ...t, completed: !t.completed }
            : t
        )
      }
    case 'todo/rollback':
      return { ...state, todos: (action as TodoRollbackAction).payload }
    case 'sync/start':
      return { ...state, syncing: [...state.syncing, (action as SyncStartAction).payload] }
    case 'sync/end':
      return { ...state, syncing: state.syncing.filter((id: number) => id !== (action as SyncEndAction).payload) }
    default:
      return state
  }
}

const store = createStore(todoReducer, applyMiddleware(thunk))

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

const todoList = document.getElementById('todo-list')!
const stateDisplay = document.getElementById('state-display')!
const rollbackNotice = document.getElementById('rollback-notice')!
const toggleError = document.getElementById('toggle-error') as HTMLInputElement

function fakeServerSave(todoId: number, completed: boolean, shouldFail: boolean): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail) {
        reject(new Error('Server error: сохранение не удалось'))
      } else {
        resolve()
      }
    }, 1000)
  })
}

const toggleTodo = (id: number) => {
  return async (dispatch: any, getState: any): Promise<void> => {
    const previousTodos: Todo[] = (getState() as AppState).todos
    const todo = previousTodos.find((t: Todo) => t.id === id)!
    const newCompleted = !todo.completed
    const shouldFail = toggleError.checked

    consolePanel.log(`optimistic: dispatch toggle #${id} → completed: ${newCompleted}`, 'color: #569cd6')
    dispatch({ type: 'todo/toggled', payload: id })
    dispatch({ type: 'sync/start', payload: id })

    consolePanel.log(`server: ⏳ сохранение на сервер (1 сек)...${shouldFail ? ' [WILL FAIL]' : ''}`, 'color: #dcdcaa')

    try {
      await fakeServerSave(id, newCompleted, shouldFail)

      dispatch({ type: 'sync/end', payload: id })
      consolePanel.success(`server: ✓ сервер подтвердил изменение #${id}`)
      rollbackNotice.style.display = 'none'
    } catch (err: any) {
      consolePanel.error(`server: ✗ ${err.message}`)

      dispatch({ type: 'todo/rollback', payload: previousTodos })
      dispatch({ type: 'sync/end', payload: id })
      consolePanel.warn(`rollback: dispatch({ type: "todo/rollback" }) — возврат к предыдущему состоянию`)

      rollbackNotice.style.display = 'block'
      setTimeout((): void => {
        rollbackNotice.style.display = 'none'
      }, 3000)
    }

    consolePanel.log('')
  }
}

function render(): void {
  const state = store.getState() as AppState

  todoList.innerHTML = state.todos.map((todo: Todo) => {
    const isSyncing = state.syncing.includes(todo.id)
    const syncBadge = isSyncing
      ? '<span style="font-size: 0.7rem; color: var(--accent-orange); margin-left: auto;">⏳ syncing</span>'
      : ''

    return `
      <label data-id="${todo.id}" style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.15s; ${isSyncing ? 'opacity: 0.7;' : ''}" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">
        <input type="checkbox" class="todo-checkbox" data-todo-id="${todo.id}"
          ${todo.completed ? 'checked' : ''} ${isSyncing ? 'disabled' : ''}
          style="accent-color: var(--accent-green); width: 16px; height: 16px; cursor: pointer;">
        <span style="color: ${todo.completed ? 'var(--text-muted)' : 'var(--text-bright)'}; font-size: 0.9rem; ${todo.completed ? 'text-decoration: line-through;' : ''} flex: 1;">
          ${todo.text}
        </span>
        ${syncBadge}
      </label>
    `
  }).join('')

  todoList.querySelectorAll('.todo-checkbox').forEach((checkbox) => {
    checkbox.addEventListener('change', (e: Event): void => {
      e.preventDefault()
      const id = parseInt((checkbox as HTMLInputElement).dataset.todoId!, 10)
      consolePanel.log(`──── toggleTodo(${id}) — optimistic update ────`)
      store.dispatch(toggleTodo(id) as any)
    })
  })

  stateDisplay.textContent = JSON.stringify(state, null, 2)
}

store.subscribe(render)
render()

consolePanel.info('Optimistic update: UI обновляется до ответа сервера')
consolePanel.info('Включите "Simulate error" для демонстрации rollback')
