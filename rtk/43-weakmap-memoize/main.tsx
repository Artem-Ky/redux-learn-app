import {
  configureStore,
  createSlice,
  createSelector,
  createSelectorCreator,
  lruMemoize,
  weakMapMemoize,
  nanoid,
  type PayloadAction,
  type Selector,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── Types ─────────────────────────────────────────────────────────

interface Todo { id: string; text: string; done: boolean }
interface TodosState { items: Todo[] }
interface UiState { theme: 'light' | 'dark' }
type RootState = { todos: TodosState; ui: UiState }

type Mode = 'lru1' | 'weakmap' | 'weakmap-smart' | 'factory'
type TodoSelector = Selector<RootState, Todo | undefined, [string]>

// ── Tracker: считает вызовы combiner'а ────────────────────────────

const tracker = { calls: 0, last: new Map<string, number>() }

function trackCompute(id: string): void {
  tracker.calls += 1
  tracker.last.set(id, (tracker.last.get(id) ?? 0) + 1)
}

// ── Selectors: три стратегии ──────────────────────────────────────

// 1) lruMemoize(maxSize: 1) — ЯВНО. Это был default в reselect v4.
//    В v5 default поменяли на weakMapMemoize, поэтому "обычный"
//    createSelector без опций больше не демонстрирует проблему cache-1.
const createSelectorLru1 = createSelectorCreator(lruMemoize, { maxSize: 1 })
const selectTodoByIdLru1: TodoSelector = createSelectorLru1(
  [
    (s: RootState) => s.todos.items,
    (_s: RootState, id: string) => id,
  ],
  (items, id): Todo | undefined => {
    trackCompute(id)
    return items.find((t) => t.id === id)
  },
)

// 2) weakMapMemoize + input=items — один селектор, дерево WeakMap по
//    (items, id). Новая ссылка items = осиротевшая ветка дерева.
const selectTodoByIdWeak: TodoSelector = createSelector(
  [
    (s: RootState) => s.todos.items,
    (_s: RootState, id: string) => id,
  ],
  (items, id): Todo | undefined => {
    trackCompute(id)
    return items.find((t) => t.id === id)
  },
  { memoize: weakMapMemoize, argsMemoize: weakMapMemoize },
)

// 2b) weakMapMemoize + input=items.find(id) — тот же weakmap, но input
//     извлекает конкретный объект. Теперь при toggle одного todo
//     49 других дают input === prev → 49 hit, 1 miss. То же поведение,
//     что у factory, но без ручного Map<id, selector>.
const selectTodoByIdWeakSmart: TodoSelector = createSelector(
  [
    (s: RootState, id: string) => s.todos.items.find((t) => t.id === id),
    (_s: RootState, id: string) => id,
  ],
  (item, id): Todo | undefined => {
    trackCompute(id)
    return item
  },
  { memoize: weakMapMemoize, argsMemoize: weakMapMemoize },
)

// 3) Фабрика селекторов — каждому id свой селектор с lruMemoize(1).
//    Классический до-weakMap трюк: N маленьких селекторов вместо
//    одного большого с «умным» кешем. Кеш каждого — всегда размер 1.
//
//    Важно: input-селектор извлекает САМ объект todo (через find),
//    а не весь массив items. Благодаря structural sharing Immer'а,
//    при toggle одного элемента 49 других остаются ТЕМИ ЖЕ ссылками
//    → input === prev у 49 селекторов → 49 hit, 1 miss.
//    Если input был бы `items` — все 50 миссили бы при каждом toggle.
const factoryCache = new Map<string, TodoSelector>()
function makeSelectorFor(id: string): TodoSelector {
  const sel = createSelectorLru1(
    [(s: RootState) => s.todos.items.find((t) => t.id === id)],
    (item): Todo | undefined => {
      trackCompute(id)
      return item
    },
  )
  // Оборачиваем, чтобы сигнатура совпадала с TodoSelector (state, id).
  return (state: RootState, _id: string) => sel(state)
}
const selectTodoByIdFactory: TodoSelector = (state, id) => {
  let sel = factoryCache.get(id)
  if (!sel) {
    sel = makeSelectorFor(id)
    factoryCache.set(id, sel)
  }
  return sel(state, id)
}

const selectors: Record<Mode, TodoSelector> = {
  lru1: selectTodoByIdLru1,
  weakmap: selectTodoByIdWeak,
  'weakmap-smart': selectTodoByIdWeakSmart,
  factory: selectTodoByIdFactory,
}

// ── Slices ────────────────────────────────────────────────────────

const seed = (): Todo[] =>
  Array.from({ length: 50 }).map((_, i) => ({
    id: nanoid(),
    text: `Todo #${i + 1}`,
    done: i % 7 === 0,
  }))

const todosSlice = createSlice({
  name: 'todos',
  initialState: { items: seed() } as TodosState,
  reducers: {
    toggle: (s, a: PayloadAction<string>) => {
      const t = s.items.find((x) => x.id === a.payload)
      if (t) t.done = !t.done
    },
    add: (s) => {
      s.items.push({ id: nanoid(), text: `Todo #${s.items.length + 1}`, done: false })
    },
    reset: () => ({ items: seed() }),
  },
})

const uiSlice = createSlice({
  name: 'ui',
  initialState: { theme: 'dark' } as UiState,
  reducers: {
    toggleTheme: (s) => {
      s.theme = s.theme === 'dark' ? 'light' : 'dark'
    },
  },
})

const store = configureStore({
  reducer: { todos: todosSlice.reducer, ui: uiSlice.reducer },
})

// ── UI ────────────────────────────────────────────────────────────

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог weakMapMemoize',
)
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const gridEl = document.getElementById('grid')!
const lastComputesEl = document.getElementById('last-computes')!
const totalComputesEl = document.getElementById('total-computes')!
const hitRateEl = document.getElementById('hit-rate')!
const factorySizeEl = document.getElementById('factory-size')!
const modeSwitch = document.getElementById('mode-switch')!

let mode: Mode = 'lru1'
let totalCalls = 0
let totalLookups = 0
let lastRunComputes = 0

function render(): void {
  const state = store.getState()
  const items = state.todos.items
  const sel = selectors[mode]
  const before = tracker.calls

  gridEl.innerHTML = ''
  items.forEach((t) => {
    const callsBefore = tracker.calls
    const got = sel(state, t.id)
    const wasMiss = tracker.calls > callsBefore
    totalLookups += 1

    const el = document.createElement('div')
    el.className = `todo-cell ${got?.done ? 'todo-cell--done' : ''} ${wasMiss ? 'miss' : 'hit'}`
    el.innerHTML = `
      <span class="todo-cell__id">${got ? got.id.slice(0, 4) : '??'}</span>
      <span class="todo-cell__text">${got ? got.text : '—'}</span>
      <span style="font-size:.62rem; color:${wasMiss ? 'var(--error)' : 'var(--success)'}">${wasMiss ? 'MISS' : 'HIT'}</span>
    `
    gridEl.appendChild(el)
  })

  lastRunComputes = tracker.calls - before
  totalCalls = tracker.calls

  const hits = Math.max(0, totalLookups - totalCalls)

  lastComputesEl.textContent = `${lastRunComputes} / ${items.length}`
  totalComputesEl.textContent = String(totalCalls)
  hitRateEl.textContent = `${hits} / ${totalLookups}`
  factorySizeEl.textContent = String(factoryCache.size)
}
render()
store.subscribe(render)

// ── Mode switch ───────────────────────────────────────────────────

const modeInfo: Record<Mode, string> = {
  lru1:
    'lruMemoize(1) + input=items: кеш на 1 запись, каждый id вытесняет предыдущий → 50 miss на каждом render.',
  weakmap:
    'weakMapMemoize + input=(items, id): дерево WeakMap по items→id. toggleTheme = 50 hit. toggle todo = 50 miss (items новая ссылка → осиротевшая ветка дерева).',
  'weakmap-smart':
    'weakMapMemoize + input=items.find(id): тот же weakmap, но input извлекает объект. Structural sharing → toggle todo = 49 hit, 1 miss. Без ручного Map.',
  factory:
    'Factory + input=items.find(id): N селекторов с lruMemoize(1). Поведение как у weakmap-smart, но нужен Map<id, selector> и явная очистка.',
}

modeSwitch.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.mode-btn')
  if (!btn) return
  const newMode = btn.dataset.mode as Mode
  if (newMode === mode) return

  mode = newMode
  modeSwitch.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'))
  btn.classList.add('active')

  tracker.calls = 0
  tracker.last.clear()
  totalCalls = 0
  totalLookups = 0
  lastRunComputes = 0

  con.info(`Режим переключён → "${mode}". Счётчики сброшены.`)
  con.warn(modeInfo[mode])
  render()
})

// ── Actions ───────────────────────────────────────────────────────

document.querySelector('[data-act="theme"]')!.addEventListener('click', () => {
  const a = uiSlice.actions.toggleTheme()
  store.dispatch(a)
  con.action(a)
  const items = store.getState().todos.items
  con.info(
    `toggleTheme: state.todos.items ссылка не менялась → ${
      mode === 'lru1'
        ? `но lruMemoize(1) вытесняет → ${items.length}/${items.length} miss`
        : mode === 'weakmap'
        ? `все ${items.length} hit'а (WeakMap помнит все id)`
        : `все ${items.length} hit'а (в factoryCache ${factoryCache.size} селекторов с сохранённым кешем)`
    }.`,
  )
})

document.querySelector('[data-act="toggle-random"]')!.addEventListener('click', () => {
  const items = store.getState().todos.items
  if (items.length === 0) return
  const t = items[Math.floor(Math.random() * items.length)]
  const a = todosSlice.actions.toggle(t.id)
  store.dispatch(a)
  con.action(a)
  con.info(
    `toggle #${t.id.slice(0, 4)}: items — новая ссылка, но Immer structural sharing оставил 49 объектов по тем же ссылкам. ${
      mode === 'lru1'
        ? `lruMemoize(1) этого не видит (input=items) → 50 miss.`
        : mode === 'weakmap'
        ? `weakmap не видит (input=items, новая ссылка → новая ветка) → 50 miss.`
        : mode === 'weakmap-smart'
        ? `weakmap со smart input видит (input=items.find(id)) → 49 hit, 1 miss.`
        : `factory видит (input=items.find(id)) → 49 hit, 1 miss.`
    }`,
  )
})

document.querySelector('[data-act="add"]')!.addEventListener('click', () => {
  const a = todosSlice.actions.add()
  store.dispatch(a)
  con.action(a)
  con.info(
    mode === 'factory' || mode === 'weakmap-smart'
      ? 'add: items новая ссылка, но старые объекты не менялись → 50 hit. Новый id → 1 miss.'
      : 'add: items ссылка меняется → все 50 пересчитались + 1 новый.',
  )
})

document.querySelector('[data-act="reset"]')!.addEventListener('click', () => {
  const a = todosSlice.actions.reset()
  store.dispatch(a)
  con.action(a)
  tracker.calls = 0
  tracker.last.clear()
  totalCalls = 0
  totalLookups = 0
  factoryCache.clear()
  con.warn('Reset: счётчики обнулены, ids новые, factoryCache очищен.')
})

con.log('В reselect v5 default для createSelector — weakMapMemoize. lruMemoize(1) надо включать явно.')
con.info('Hit rate = (lookups - computes) / lookups × 100%. Цель — 100% при toggleTheme.')
con.success('Сравните weakmap vs factory: одинаковый результат, разные механизмы.')
