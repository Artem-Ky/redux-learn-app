import { legacy_createStore as createStore } from 'redux'
import { createSelector } from 'reselect'
import { ConsolePanel } from '../shared/console-panel'

interface Todo {
  id: number
  text: string
  completed: boolean
}

interface AppState {
  todos: Todo[]
  ui: { darkMode: boolean }
  nextId: number
}

interface AddTodoAction { type: 'todos/add'; payload: string }
interface ToggleTodoAction { type: 'todos/toggle'; payload: number }
interface UiToggleAction { type: 'ui/toggle' }
interface ForceNewRefAction { type: 'todos/forceNewRef' }

type AppAction = AddTodoAction | ToggleTodoAction | UiToggleAction | ForceNewRefAction | { type: string }

const initialState: AppState = {
  todos: [
    { id: 1, text: 'Изучить createSelector', completed: false },
    { id: 2, text: 'Понять кэширование', completed: true }
  ],
  ui: { darkMode: false },
  nextId: 3
}

function reducer(state: AppState = initialState, action: AppAction): AppState {
  switch (action.type) {
    case 'todos/add':
      return {
        ...state,
        todos: [...state.todos, {
          id: state.nextId,
          text: (action as AddTodoAction).payload,
          completed: false
        }],
        nextId: state.nextId + 1
      }
    case 'todos/toggle':
      return {
        ...state,
        todos: state.todos.map(t =>
          t.id === (action as ToggleTodoAction).payload
            ? { ...t, completed: !t.completed }
            : t
        )
      }
    case 'ui/toggle':
      return { ...state, ui: { ...state.ui, darkMode: !state.ui.darkMode } }
    case 'todos/forceNewRef':
      return { ...state, todos: [...state.todos] }
    default:
      return state
  }
}

const store = createStore(reducer)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

let recomputeCounter = 0
let callCounter = 0

const selectTodos = (state: AppState): Todo[] => state.todos

const selectCompletedTodos = createSelector(
  [selectTodos],
  (todos: Todo[]): Todo[] => {
    recomputeCounter++
    return todos.filter(t => t.completed)
  }
)

function callSelectorAndTrack(): void {
  callCounter++
  const prevRecompute = recomputeCounter
  const result = selectCompletedTodos(store.getState())
  const hit = recomputeCounter === prevRecompute

  document.getElementById('recompute-count')!.textContent = String(recomputeCounter)
  document.getElementById('call-count')!.textContent = String(callCounter)
  document.getElementById('cache-hits')!.textContent = String(callCounter - recomputeCounter)

  if (hit) {
    consolePanel.success(`Вызов #${callCounter}: КЭШ СРАБОТАЛ! Completed: [${result.map(t => t.text).join(', ')}]`)
  } else {
    consolePanel.warn(`Вызов #${callCounter}: ПЕРЕСЧЁТ output selector. Completed: [${result.map(t => t.text).join(', ')}]`)
  }
}

function renderTodos(): void {
  const state = store.getState()
  const todoList = document.getElementById('todo-list')!

  todoList.innerHTML = state.todos.length > 0
    ? state.todos.map(todo => `
      <div style="display: flex; gap: 12px; padding: 8px; border-bottom: 1px solid var(--border); align-items: center;">
        <button class="btn btn--sm" data-toggle="${todo.id}" style="width: 28px; padding: 4px; color: ${todo.completed ? 'var(--accent-green)' : 'var(--text-muted)'};">
          ${todo.completed ? '✔' : '○'}
        </button>
        <span style="flex: 1; color: var(--text-bright); ${todo.completed ? 'text-decoration: line-through; opacity: 0.5;' : ''}">
          ${todo.text}
        </span>
      </div>
    `).join('')
    : '<div style="color: var(--text-muted); padding: 16px; text-align: center;">Пусто</div>'

  todoList.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', (): void => {
      const id = parseInt((btn as HTMLElement).dataset.toggle!, 10)
      store.dispatch({ type: 'todos/toggle', payload: id })
      consolePanel.log(`→ dispatch: todos/toggle (id: ${id}) — todos изменились`)
      callSelectorAndTrack()
    })
  })
}

store.subscribe(renderTodos)
renderTodos()

consolePanel.info('🔬 Reselect: глубокое погружение в кэширование')
consolePanel.log('')
consolePanel.log('createSelector кэширует ТОЛЬКО последний результат (cache size = 1).')
consolePanel.log('Input selectors проверяются через === (строгое равенство ссылок).')
consolePanel.log('')

callSelectorAndTrack()

const inputTodo = document.getElementById('input-todo') as HTMLInputElement
const btnAdd = document.getElementById('btn-add')!
const btnNoChange = document.getElementById('btn-no-change')!
const btnCallSelector = document.getElementById('btn-call-selector')!
const btnNewRef = document.getElementById('btn-new-ref')!

btnAdd.addEventListener('click', (): void => {
  const text = inputTodo.value.trim()
  if (!text) return
  store.dispatch({ type: 'todos/add', payload: text })
  consolePanel.log(`→ dispatch: todos/add ("${text}") — todos изменились`)
  callSelectorAndTrack()
  inputTodo.value = ''
})

inputTodo.addEventListener('keydown', (e: KeyboardEvent): void => {
  if (e.key === 'Enter') btnAdd.click()
})

btnNoChange.addEventListener('click', (): void => {
  consolePanel.log('')
  consolePanel.log('→ dispatch: ui/toggle — todos НЕ изменились')
  store.dispatch({ type: 'ui/toggle' })
  callSelectorAndTrack()
  consolePanel.info('  state.todos === предыдущий state.todos → кэш сработал!')
})

btnCallSelector.addEventListener('click', (): void => {
  consolePanel.log('')
  consolePanel.log('→ Вызываем selectCompletedTodos(state) без dispatch')
  callSelectorAndTrack()
  consolePanel.info('  Тот же state → тот же кэш')
})

btnNewRef.addEventListener('click', (): void => {
  consolePanel.log('')
  consolePanel.log('→ dispatch: todos/forceNewRef — создаём НОВУЮ ссылку на массив')
  consolePanel.log('  Данные те же, но [...state.todos] создаёт новый массив')
  store.dispatch({ type: 'todos/forceNewRef' })
  callSelectorAndTrack()
  consolePanel.error('  Кэш сломан! Ссылка изменилась, хотя данные те же.')
  consolePanel.warn('  Это главная «ловушка» Reselect: === проверяет ссылку, не содержимое.')
})
