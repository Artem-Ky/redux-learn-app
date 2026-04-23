import {
  configureStore,
  createSlice,
  createSelector,
  nanoid,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── Types ─────────────────────────────────────────────────────────

interface Todo { id: string; text: string; done: boolean }
interface TodosState { items: Todo[] }
interface UiState { theme: 'light' | 'dark' }
type RootState = { todos: TodosState; ui: UiState }

// ── Slices ────────────────────────────────────────────────────────

const seedTodos = (): Todo[] => [
  { id: nanoid(), text: 'Изучить createSelector', done: false },
  { id: nanoid(), text: 'Сравнить naive и memoized', done: false },
  { id: nanoid(), text: 'Прочитать reselect docs', done: true },
]

const todosSlice = createSlice({
  name: 'todos',
  initialState: { items: seedTodos() } as TodosState,
  reducers: {
    toggle: (s, a: PayloadAction<string>) => {
      const t = s.items.find((x) => x.id === a.payload)
      if (t) t.done = !t.done
    },
    add: (s, a: PayloadAction<string>) => {
      s.items.push({ id: nanoid(), text: a.payload, done: false })
    },
    reset: () => ({ items: seedTodos() }),
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

// ── Selectors ─────────────────────────────────────────────────────

// NAIVE: вычисляем прямо в селекторе → новый массив на каждый вызов.
let naiveCalls = 0
const selectActiveNaive = (state: RootState): Todo[] => {
  naiveCalls += 1
  return state.todos.items.filter((t) => !t.done)
}

// MEMOIZED: combiner вызывается только если state.todos.items !== предыдущий.
let memoCalls = 0
const selectActiveMemoized = createSelector(
  [(state: RootState) => state.todos.items],
  (items) => {
    memoCalls += 1
    return items.filter((t) => !t.done)
  },
)

// ── UI ────────────────────────────────────────────────────────────

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог createSelector',
)
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const naiveListEl = document.getElementById('naive-list')!
const memoListEl = document.getElementById('memo-list')!
const naiveRendersEl = document.getElementById('naive-renders')!
const memoRendersEl = document.getElementById('memo-renders')!
const naiveCallsEl = document.getElementById('naive-calls')!
const memoCallsEl = document.getElementById('memo-calls')!
const naiveCmpEl = document.getElementById('naive-cmp')!
const memoCmpEl = document.getElementById('memo-cmp')!
const themeBannerEl = document.getElementById('theme-banner')!
const dispatchCountEl = document.getElementById('dispatch-count')!
const naiveRateEl = document.getElementById('naive-rate')!
const memoRateEl = document.getElementById('memo-rate')!
const savingsEl = document.getElementById('savings')!

let dispatches = 0
let naiveRenders = 0
let memoRenders = 0
let prevNaiveRef: Todo[] | null = null
let prevMemoRef: Todo[] | null = null

function renderList(container: HTMLElement, items: Todo[]): void {
  container.innerHTML = items
    .map(
      (t) =>
        `<div class="todo-item ${t.done ? 'todo-item--done' : ''}" data-id="${t.id}">
           <span>${t.done ? '☑' : '☐'}</span><span>${t.text}</span>
         </div>`,
    )
    .join('') || '<div style="color:var(--text-muted)">— нет активных —</div>'
}

function flash(el: HTMLElement, ok: boolean): void {
  el.classList.remove('flash', 'flash--ok')
  void el.offsetWidth // restart animation
  el.classList.add(ok ? 'flash--ok' : 'flash')
}

function render(): void {
  const state = store.getState()

  // ── NAIVE branch ──
  const naiveResult = selectActiveNaive(state)
  const naiveSame = prevNaiveRef !== null && naiveResult === prevNaiveRef
  if (!naiveSame) {
    naiveRenders += 1
    renderList(naiveListEl, naiveResult)
    flash(naiveListEl, false)
  }
  prevNaiveRef = naiveResult

  // ── MEMOIZED branch ──
  const memoResult = selectActiveMemoized(state)
  const memoSame = prevMemoRef !== null && memoResult === prevMemoRef
  if (!memoSame) {
    memoRenders += 1
    renderList(memoListEl, memoResult)
    flash(memoListEl, true)
  }
  prevMemoRef = memoResult

  // ── Theme banner ──
  themeBannerEl.className = `theme-banner ${state.ui.theme}`
  themeBannerEl.textContent = `theme: ${state.ui.theme}`

  // ── Meters ──
  naiveRendersEl.textContent = String(naiveRenders)
  memoRendersEl.textContent = String(memoRenders)
  naiveCallsEl.textContent = String(naiveCalls)
  memoCallsEl.textContent = String(memoCalls)
  naiveCmpEl.textContent = prevNaiveRef
    ? `prev === next? ${naiveSame ? '✔ true (same ref)' : '✖ false (new ref)'}`
    : 'prev === next? —'
  memoCmpEl.textContent = prevMemoRef
    ? `prev === next? ${memoSame ? '✔ true (cache hit)' : '✖ false (recomputed)'}`
    : 'prev === next? —'
  dispatchCountEl.textContent = String(dispatches)
  naiveRateEl.textContent = String(naiveCalls)
  memoRateEl.textContent = String(memoCalls)
  savingsEl.textContent = `${Math.max(0, naiveCalls - memoCalls)} вызовов (${
    naiveCalls === 0 ? 0 : Math.round(((naiveCalls - memoCalls) / naiveCalls) * 100)
  }%)`
}
render()
store.subscribe(render)

// ── Actions ───────────────────────────────────────────────────────

function bump(): void {
  dispatches += 1
}

document.querySelector('[data-act="theme"]')!.addEventListener('click', () => {
  const a = uiSlice.actions.toggleTheme()
  store.dispatch(a)
  con.action(a)
  bump()
  const before = memoCalls
  // Force re-read so the logging reflects what just happened.
  selectActiveMemoized(store.getState())
  if (memoCalls === before) {
    con.success('Memoized: cache hit — combiner не вызван (theme не трогает todos).')
  } else {
    con.warn('Memoized: cache miss — но должен был быть hit.')
  }
  con.info(
    `Dispatch #${dispatches}: toggleTheme → naive combiner:+1 (всегда), memoized: ${
      memoCalls === before ? 'hit (+0)' : 'miss (+1)'
    }`,
  )
})

document.querySelector('[data-act="toggle1"]')!.addEventListener('click', () => {
  const first = store.getState().todos.items[0]
  if (!first) return
  const a = todosSlice.actions.toggle(first.id)
  store.dispatch(a)
  con.action(a)
  bump()
  con.info(
    `Dispatch #${dispatches}: todos/toggle → items ссылка поменялась → оба пересчитали.`,
  )
})

document.querySelector('[data-act="add"]')!.addEventListener('click', () => {
  const a = todosSlice.actions.add(`todo #${store.getState().todos.items.length + 1}`)
  store.dispatch(a)
  con.action(a)
  bump()
  con.info(
    `Dispatch #${dispatches}: todos/add → items ссылка поменялась → оба пересчитали.`,
  )
})

document.querySelector('[data-act="reset"]')!.addEventListener('click', () => {
  const a = todosSlice.actions.reset()
  store.dispatch(a)
  con.action(a)
  bump()
  con.warn('Reset: новый массив items → miss у обоих селекторов (новая ссылка).')
})

con.log(
  'createSelector из @reduxjs/toolkit — это re-export из reselect. Никакой магии, просто удобство.',
)
con.info(
  'Следите за счётчиком "Combiner calls": у memoized он не растёт при toggleTheme.',
)
con.success(
  'Правило: input-selector = cheap pluck ссылки, resultFunc = expensive compute.',
)
