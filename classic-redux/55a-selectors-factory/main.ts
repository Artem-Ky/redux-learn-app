import { legacy_createStore as createStore } from 'redux'
import { createSelector } from 'reselect'
import { DevToolsPanel } from '../shared/devtools-panel'
import { ConsolePanel } from '../shared/console-panel'

interface Todo {
  id: number
  text: string
  completed: boolean
}

interface RootState {
  todos: Todo[]
}

const initialTodos: Todo[] = [
  { id: 0, text: 'Изучить Actions', completed: true },
  { id: 1, text: 'Изучить Reducers', completed: false },
  { id: 2, text: 'Изучить Store', completed: false },
  { id: 3, text: 'Изучить Selectors', completed: true },
  { id: 4, text: 'Изучить Middleware', completed: false },
]

function todosReducer(state: Todo[] = initialTodos, action: any): Todo[] {
  switch (action.type) {
    case 'todos/toggled':
      return state.map(t => t.id === action.payload ? { ...t, completed: !t.completed } : t)
    case 'noop':
      return state
    default:
      return state
  }
}

function rootReducer(state: RootState | undefined, action: any): RootState {
  return { todos: todosReducer(state?.todos, action) }
}

const store = createStore(rootReducer)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const con = new ConsolePanel(document.getElementById('console-container')!, 'Счётчик пересчётов селекторов')

// ─── Shared selector (один на всех) ───

const selectTodos = (state: RootState) => state.todos

let sharedRecomputeCount = 0

const selectTodoByIdShared = createSelector(
  selectTodos,
  (_: RootState, id: number) => id,
  (todos, id) => {
    sharedRecomputeCount++
    return todos.find(t => t.id === id)
  }
)

// ─── Factory selector (свой на каждую строку) ───

const factoryRecomputeCounts: Record<number, number> = {}

const makeSelectTodoById = (todoId: number) => {
  factoryRecomputeCounts[todoId] = 0
  return createSelector(
    selectTodos,
    (_: RootState, id: number) => id,
    (todos, id) => {
      factoryRecomputeCounts[todoId]++
      return todos.find(t => t.id === id)
    }
  )
}

const factorySelectors = new Map<number, ReturnType<typeof makeSelectTodoById>>()
for (const todo of initialTodos) {
  factorySelectors.set(todo.id, makeSelectTodoById(todo.id))
}

// ─── Rendering ───

function renderSharedList(): void {
  const state = store.getState()
  const container = document.getElementById('shared-list')!
  const prevCount = sharedRecomputeCount

  const rows = initialTodos.map(todo => {
    const countBefore = sharedRecomputeCount
    const selected = selectTodoByIdShared(state, todo.id)
    const recomputed = sharedRecomputeCount > countBefore
    const status = selected?.completed ? '✅' : '⬜'

    return `
      <div class="todo-row">
        <span class="todo-row__id">#${todo.id}</span>
        <span class="todo-row__text">${status} ${selected?.text ?? '?'}</span>
        <span class="todo-row__selector-info">shared instance</span>
        <span class="todo-row__recompute ${recomputed ? 'hit' : 'zero'}">
          ${recomputed ? '⚡ recompute' : '— cached'}
        </span>
      </div>
    `
  }).join('')

  container.innerHTML = rows
  document.getElementById('shared-total')!.textContent =
    `Всего пересчётов: ${sharedRecomputeCount} (было ${prevCount}, +${sharedRecomputeCount - prevCount})`
}

function renderFactoryList(): void {
  const state = store.getState()
  const container = document.getElementById('factory-list')!
  const prevTotals: Record<number, number> = {}
  for (const [id, count] of Object.entries(factoryRecomputeCounts)) {
    prevTotals[Number(id)] = count
  }

  const rows = initialTodos.map(todo => {
    const selector = factorySelectors.get(todo.id)!
    const countBefore = factoryRecomputeCounts[todo.id]
    const selected = selector(state, todo.id)
    const recomputed = factoryRecomputeCounts[todo.id] > countBefore
    const status = selected?.completed ? '✅' : '⬜'

    return `
      <div class="todo-row">
        <span class="todo-row__id">#${todo.id}</span>
        <span class="todo-row__text">${status} ${selected?.text ?? '?'}</span>
        <span class="todo-row__selector-info">own instance #${todo.id}</span>
        <span class="todo-row__recompute ${recomputed ? 'hit' : 'zero'}">
          ${recomputed ? '⚡ recompute' : '— cached'}
        </span>
      </div>
    `
  }).join('')

  container.innerHTML = rows

  const totalFactory = Object.values(factoryRecomputeCounts).reduce((a, b) => a + b, 0)
  const prevTotal = Object.values(prevTotals).reduce((a, b) => a + b, 0)
  document.getElementById('factory-total')!.textContent =
    `Всего пересчётов: ${totalFactory} (было ${prevTotal}, +${totalFactory - prevTotal})`
}

function render(): void {
  renderSharedList()
  renderFactoryList()
}

store.subscribe(render)

// initial render — primes caches
render()

// ─── Log initial ───
con.info('Начальный рендер: оба подхода вычислили все 5 строк')
con.log(`Shared: ${sharedRecomputeCount} пересчётов (5 строк, каждая сбрасывает кэш предыдущей)`)
const factTotal = Object.values(factoryRecomputeCounts).reduce((a, b) => a + b, 0)
con.log(`Factory: ${factTotal} пересчётов (5 строк, каждая вычислилась 1 раз)`)
con.log('')
con.info('Нажмите Toggle или Unrelated dispatch и следите за разницей')

// ─── Buttons ───

function handleToggle(id: number): void {
  const beforeShared = sharedRecomputeCount
  const beforeFactory = { ...factoryRecomputeCounts }

  store.dispatch({ type: 'todos/toggled', payload: id })

  const afterShared = sharedRecomputeCount
  const sharedDelta = afterShared - beforeShared
  const factoryDeltas = Object.entries(factoryRecomputeCounts).map(([tid, count]) => ({
    id: Number(tid),
    delta: count - (beforeFactory[Number(tid)] ?? 0)
  })).filter(d => d.delta > 0)

  con.warn(`─── Toggle #${id} ───`)
  con.error(`Shared: +${sharedDelta} пересчётов (ВСЕ строки пересчитаны — кэш бьётся при смене id)`)

  if (factoryDeltas.length === 0) {
    con.success(`Factory: +0 пересчётов (все кэши валидны!)`)
  } else {
    const ids = factoryDeltas.map(d => `#${d.id}`).join(', ')
    const total = factoryDeltas.reduce((a, d) => a + d.delta, 0)
    con.success(`Factory: +${total} пересчётов (только строки: ${ids})`)
  }
  con.log('')
}

document.getElementById('btn-toggle-0')!.addEventListener('click', () => handleToggle(0))
document.getElementById('btn-toggle-2')!.addEventListener('click', () => handleToggle(2))
document.getElementById('btn-toggle-4')!.addEventListener('click', () => handleToggle(4))

document.getElementById('btn-unrelated')!.addEventListener('click', () => {
  const beforeShared = sharedRecomputeCount
  const beforeFactoryTotal = Object.values(factoryRecomputeCounts).reduce((a, b) => a + b, 0)

  store.dispatch({ type: 'noop' })

  const sharedDelta = sharedRecomputeCount - beforeShared
  const factoryDelta = Object.values(factoryRecomputeCounts).reduce((a, b) => a + b, 0) - beforeFactoryTotal

  con.info('─── Unrelated dispatch (noop) ───')
  con.log(`Shared: +${sharedDelta} пересчётов`)
  con.log(`Factory: +${factoryDelta} пересчётов`)
  if (sharedDelta === 0 && factoryDelta === 0) {
    con.success('Оба подхода: кэш валиден, пересчётов нет (state.todos не изменился)')
  }
  con.log('')
})

document.getElementById('btn-reset-counters')!.addEventListener('click', () => {
  sharedRecomputeCount = 0
  for (const key of Object.keys(factoryRecomputeCounts)) {
    factoryRecomputeCounts[Number(key)] = 0
  }
  render()
  con.clear()
  con.info('Счётчики сброшены')
})
