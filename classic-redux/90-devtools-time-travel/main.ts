import { legacy_createStore as createStore } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'
import { ConsolePanel } from '../shared/console-panel'

interface Todo {
  id: number
  text: string
  completed: boolean
}

interface TodoState {
  todos: Todo[]
  nextId: number
}

interface AddTodoAction { type: 'todos/add'; payload: string }
interface ToggleTodoAction { type: 'todos/toggle'; payload: number }
interface RemoveTodoAction { type: 'todos/remove'; payload: number }

type TodoAction = AddTodoAction | ToggleTodoAction | RemoveTodoAction | { type: string }

const initialState: TodoState = {
  todos: [],
  nextId: 1
}

function todosReducer(state: TodoState = initialState, action: TodoAction): TodoState {
  switch (action.type) {
    case 'todos/add': {
      const text = (action as AddTodoAction).payload
      const id = state.nextId
      return {
        ...state,
        todos: [...state.todos, { id, text, completed: false }],
        nextId: id + 1
      }
    }
    case 'todos/toggle': {
      const id = (action as ToggleTodoAction).payload
      return {
        ...state,
        todos: state.todos.map(t =>
          t.id === id ? { ...t, completed: !t.completed } : t
        )
      }
    }
    case 'todos/remove': {
      const id = (action as RemoveTodoAction).payload
      return {
        ...state,
        todos: state.todos.filter(t => t.id !== id)
      }
    }
    default:
      return state
  }
}

const reduxDevToolsEnhancer =
  (window as any).__REDUX_DEVTOOLS_EXTENSION__?.() ?? undefined

const store = createStore(todosReducer, reduxDevToolsEnhancer)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

const inputTodo = document.getElementById('input-todo') as HTMLInputElement
const btnAdd = document.getElementById('btn-add')!
const btnDemo = document.getElementById('btn-demo')!
const todoList = document.getElementById('todo-list')!
const stateDisplay = document.getElementById('state-display')!

let actionCount = 0

function render(): void {
  const state = store.getState() as TodoState

  todoList.innerHTML = state.todos.length > 0
    ? state.todos.map(todo => `
      <div style="display: flex; gap: 12px; padding: 8px; border-bottom: 1px solid var(--border); align-items: center;">
        <button class="btn btn--sm" data-toggle="${todo.id}" style="width: 28px; padding: 4px; color: ${todo.completed ? 'var(--accent-green)' : 'var(--text-muted)'};">
          ${todo.completed ? '✔' : '○'}
        </button>
        <span style="flex: 1; color: var(--text-bright); ${todo.completed ? 'text-decoration: line-through; opacity: 0.5;' : ''}">
          ${todo.text}
        </span>
        <span style="color: var(--text-muted); font-family: var(--font-mono); font-size: 0.72rem;">#${todo.id}</span>
        <button class="btn btn--sm btn--danger" data-remove="${todo.id}">✕</button>
      </div>
    `).join('')
    : '<div style="color: var(--text-muted); padding: 16px; text-align: center;">Список пуст — добавьте todos</div>'

  todoList.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', (): void => {
      const id = parseInt((btn as HTMLElement).dataset.toggle!, 10)
      store.dispatch({ type: 'todos/toggle', payload: id })
      actionCount++
      consolePanel.log(`Экшен #${actionCount}: todos/toggle (id: ${id})`)
      consolePanel.info('  → Новый снимок состояния сохранён')
    })
  })

  todoList.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', (): void => {
      const id = parseInt((btn as HTMLElement).dataset.remove!, 10)
      store.dispatch({ type: 'todos/remove', payload: id })
      actionCount++
      consolePanel.log(`Экшен #${actionCount}: todos/remove (id: ${id})`)
      consolePanel.info('  → Новый снимок состояния сохранён')
    })
  })

  stateDisplay.textContent = JSON.stringify(state, null, 2)
}

store.subscribe(render)
render()

consolePanel.info('⏱ Time-Travel отладка')
consolePanel.log('')
consolePanel.log('Как это работает:')
consolePanel.log('1. Каждый dispatch создаёт снимок (snapshot) состояния')
consolePanel.log('2. Снимки хранятся в истории DevTools')
consolePanel.log('3. Slider позволяет перейти к любому снимку')
consolePanel.log('4. Auto-play воспроизводит все экшены последовательно')
consolePanel.log('')
consolePanel.info('Почему это работает:')
consolePanel.log('• Иммутабельность — каждый снимок = новый объект')
consolePanel.log('• Чистый reducer — replay даёт тот же результат')
consolePanel.log('• Нет side effects — replay безопасен')
consolePanel.log('')
consolePanel.warn('Попробуйте: добавьте todos → нажмите ⏩ Slider → двигайте ползунок')

btnAdd.addEventListener('click', (): void => {
  const text = inputTodo.value.trim()
  if (!text) return
  store.dispatch({ type: 'todos/add', payload: text })
  actionCount++
  consolePanel.log(`Экшен #${actionCount}: todos/add ("${text}")`)
  consolePanel.info('  → Снимок состояния сохранён. Сдвиньте ползунок назад, чтобы вернуться!')
  inputTodo.value = ''
})

inputTodo.addEventListener('keydown', (e: KeyboardEvent): void => {
  if (e.key === 'Enter') btnAdd.click()
})

btnDemo.addEventListener('click', (): void => {
  const demoTodos = [
    'Изучить Redux основы',
    'Понять иммутабельность',
    'Написать чистые reducers',
    'Подключить DevTools',
    'Освоить Time-Travel'
  ]

  consolePanel.log('')
  consolePanel.info('🎬 Запуск демо: добавляем 5 todos...')

  let i = 0
  const interval = setInterval((): void => {
    if (i >= demoTodos.length) {
      clearInterval(interval)
      consolePanel.log('')
      consolePanel.success(`✅ Готово! ${demoTodos.length} экшенов в истории`)
      consolePanel.warn('Теперь нажмите ⏩ Slider в DevTools и двигайте ползунок!')
      consolePanel.info('Или нажмите ▶ для авто-воспроизведения')
      return
    }
    store.dispatch({ type: 'todos/add', payload: demoTodos[i] })
    actionCount++
    consolePanel.log(`Экшен #${actionCount}: todos/add ("${demoTodos[i]}")`)
    consolePanel.info(`  → Снимок #${actionCount} сохранён`)
    i++
  }, 400)
})
