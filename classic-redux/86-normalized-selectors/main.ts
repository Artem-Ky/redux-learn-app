import { legacy_createStore as createStore } from 'redux'
import { ConsolePanel } from '../shared/console-panel'

interface Todo {
  id: number
  text: string
  completed: boolean
}

interface NormalizedState {
  ids: number[]
  entities: Record<number, Todo>
  nextId: number
}

interface AddTodoAction {
  type: 'todos/add'
  payload: string
}

interface ToggleTodoAction {
  type: 'todos/toggle'
  payload: number
}

interface RemoveTodoAction {
  type: 'todos/remove'
  payload: number
}

type AppAction = AddTodoAction | ToggleTodoAction | RemoveTodoAction | { type: string }

const initialState: NormalizedState = {
  ids: [1, 2, 3],
  entities: {
    1: { id: 1, text: 'Изучить нормализацию', completed: true },
    2: { id: 2, text: 'Написать селекторы', completed: false },
    3: { id: 3, text: 'Сравнить производительность', completed: false }
  },
  nextId: 4
}

function todosReducer(state: NormalizedState = initialState, action: AppAction): NormalizedState {
  switch (action.type) {
    case 'todos/add': {
      const id = state.nextId
      const text = (action as AddTodoAction).payload
      return {
        ...state,
        ids: [...state.ids, id],
        entities: {
          ...state.entities,
          [id]: { id, text, completed: false }
        },
        nextId: id + 1
      }
    }
    case 'todos/toggle': {
      const id = (action as ToggleTodoAction).payload
      const todo = state.entities[id]
      if (!todo) return state
      return {
        ...state,
        entities: {
          ...state.entities,
          [id]: { ...todo, completed: !todo.completed }
        }
      }
    }
    case 'todos/remove': {
      const id = (action as RemoveTodoAction).payload
      const { [id]: _, ...rest } = state.entities
      void _
      return {
        ...state,
        ids: state.ids.filter(i => i !== id),
        entities: rest
      }
    }
    default:
      return state
  }
}

const selectTodoById = (state: NormalizedState, id: number): Todo | undefined =>
  state.entities[id]

const selectAllTodos = (state: NormalizedState): Todo[] =>
  state.ids.map(id => state.entities[id])

const selectTodoIds = (state: NormalizedState): number[] =>
  state.ids

const store = createStore(todosReducer)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

const inputTodo = document.getElementById('input-todo') as HTMLInputElement
const btnAdd = document.getElementById('btn-add')!
const todoList = document.getElementById('todo-list')!
const inputLookup = document.getElementById('input-lookup') as HTMLInputElement
const btnLookup = document.getElementById('btn-lookup')!
const lookupResult = document.getElementById('lookup-result')!
const stateDisplay = document.getElementById('state-display')!

function render(): void {
  const state = store.getState()
  const todos = selectAllTodos(state)

  todoList.innerHTML = todos.map(todo => `
    <div style="display: flex; gap: 12px; padding: 8px; border-bottom: 1px solid var(--border); align-items: center;">
      <input type="checkbox" data-toggle="${todo.id}" ${todo.completed ? 'checked' : ''}
             style="cursor: pointer; width: 16px; height: 16px; accent-color: var(--success); flex-shrink: 0;">
      <span style="flex: 1; color: var(--text-bright); ${todo.completed ? 'text-decoration: line-through; opacity: 0.5;' : ''}">
        ${todo.text}
      </span>
      <span style="color: var(--text-muted); font-family: var(--font-mono); font-size: 0.75rem;">ID: ${todo.id}</span>
      <button class="btn btn--sm btn--danger" data-remove="${todo.id}">✕</button>
    </div>
  `).join('')

  todoList.querySelectorAll('[data-toggle]').forEach(el => {
    el.addEventListener('change', (): void => {
      const id = parseInt((el as HTMLInputElement).dataset.toggle!, 10)
      store.dispatch({ type: 'todos/toggle', payload: id })
      consolePanel.log(`selectTodoById(state, ${id}) → O(1) доступ`)
    })
  })

  todoList.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', (): void => {
      const id = parseInt((btn as HTMLElement).dataset.remove!, 10)
      store.dispatch({ type: 'todos/remove', payload: id })
      consolePanel.log(`Удалён todo ID: ${id}`)
    })
  })

  stateDisplay.textContent = JSON.stringify(state, null, 2)
}

function benchmarkLookup(id: number): void {
  const state = store.getState()
  const allTodos = selectAllTodos(state)

  const arraySize = 10000
  const bigArray: Todo[] = []
  for (let i = 0; i < arraySize; i++) {
    bigArray.push({ id: i + 1, text: `Todo ${i + 1}`, completed: false })
  }
  const bigEntities: Record<number, Todo> = {}
  for (const t of bigArray) {
    bigEntities[t.id] = t
  }
  const targetId = Math.min(id, arraySize)

  const t1 = performance.now()
  for (let i = 0; i < 1000; i++) {
    bigArray.find(t => t.id === targetId)
  }
  const arrayTime = performance.now() - t1

  const t2 = performance.now()
  for (let i = 0; i < 1000; i++) {
    bigEntities[targetId]
  }
  const objectTime = performance.now() - t2

  consolePanel.log(`── Сравнение производительности (${arraySize} записей, 1000 итераций) ──`)
  consolePanel.warn(`Array.find(): ${arrayTime.toFixed(3)} мс`)
  consolePanel.success(`Object[id]:   ${objectTime.toFixed(3)} мс`)
  consolePanel.info(`Разница: Object[id] в ~${Math.round(arrayTime / Math.max(objectTime, 0.001))}× быстрее`)

  const found = selectTodoById(state, id)
  if (found) {
    lookupResult.textContent = `"${found.text}" (${found.completed ? 'выполнено' : 'активно'})`
    lookupResult.style.color = 'var(--accent-cyan)'
    consolePanel.success(`selectTodoById(state, ${id}) → "${found.text}"`)
  } else {
    lookupResult.textContent = `ID ${id} не найден`
    lookupResult.style.color = 'var(--accent-red)'
    consolePanel.warn(`selectTodoById(state, ${id}) → undefined`)
  }

  consolePanel.log(`selectTodoIds(state) → [${selectTodoIds(state).join(', ')}]`)
  consolePanel.log(`selectAllTodos(state) → ${allTodos.length} элементов`)
}

store.subscribe(render)
render()

consolePanel.info('Селекторы для нормализованного состояния')
consolePanel.log('selectTodoById(state, id) — O(1) через entities[id]')
consolePanel.log('selectAllTodos(state)     — ids.map(id => entities[id])')
consolePanel.log('selectTodoIds(state)      — state.ids')
consolePanel.log('')

const state = store.getState()
consolePanel.success(`Начальное состояние: ${selectTodoIds(state).length} todo`)
consolePanel.log(`IDs: [${selectTodoIds(state).join(', ')}]`)

btnAdd.addEventListener('click', (): void => {
  const text = inputTodo.value.trim()
  if (!text) return
  store.dispatch({ type: 'todos/add', payload: text })
  consolePanel.log(`Добавлен todo: "${text}"`)
  inputTodo.value = ''
})

inputTodo.addEventListener('keydown', (e: KeyboardEvent): void => {
  if (e.key === 'Enter') btnAdd.click()
})

btnLookup.addEventListener('click', (): void => {
  const id = parseInt(inputLookup.value, 10)
  if (isNaN(id)) {
    lookupResult.textContent = 'Введите число'
    lookupResult.style.color = 'var(--accent-orange)'
    return
  }
  benchmarkLookup(id)
})

inputLookup.addEventListener('keydown', (e: KeyboardEvent): void => {
  if (e.key === 'Enter') btnLookup.click()
})
