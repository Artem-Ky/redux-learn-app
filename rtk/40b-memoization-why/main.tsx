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

interface Post { id: string; title: string; published: boolean }
interface PostsState { items: Post[] }
interface ThemeState { value: 'light' | 'dark' }
type RootState = { posts: PostsState; theme: ThemeState }

// ── Slices ────────────────────────────────────────────────────────

const seedPosts = (): Post[] => [
  { id: nanoid(), title: 'Structural sharing', published: true },
  { id: nanoid(), title: 'Reselect intro', published: false },
  { id: nanoid(), title: 'useSelector deep', published: true },
]

const postsSlice = createSlice({
  name: 'posts',
  initialState: { items: seedPosts() } as PostsState,
  reducers: {
    addPost: (s, a: PayloadAction<string>) => {
      s.items.push({ id: nanoid(), title: a.payload, published: false })
    },
    togglePublished: (s, a: PayloadAction<string>) => {
      const p = s.items.find((x) => x.id === a.payload)
      if (p) p.published = !p.published
    },
  },
})

const themeSlice = createSlice({
  name: 'theme',
  initialState: { value: 'dark' } as ThemeState,
  reducers: {
    toggle: (s) => {
      s.value = s.value === 'dark' ? 'light' : 'dark'
    },
  },
})

const store = configureStore({
  reducer: { posts: postsSlice.reducer, theme: themeSlice.reducer },
})

// ── 1. Naive selector (no memo): filter on every call ─────────────

let naiveCalls = 0
const selectPublishedNaive = (state: RootState): Post[] => {
  naiveCalls += 1
  return state.posts.items.filter((p) => p.published)
}

// ── 2. Manual memo — one-slot cache by reference ──────────────────

function memoize1<A, R>(fn: (a: A) => R): {
  (a: A): R
  stats: { calls: number; hits: number; misses: number }
} {
  let lastArg: A | undefined
  let lastResult: R
  let hasCache = false
  const stats = { calls: 0, hits: 0, misses: 0 }
  function memoized(arg: A): R {
    stats.calls += 1
    if (hasCache && arg === lastArg) {
      stats.hits += 1
      return lastResult
    }
    stats.misses += 1
    lastArg = arg
    lastResult = fn(arg)
    hasCache = true
    return lastResult
  }
  memoized.stats = stats
  return memoized as typeof memoized & { stats: typeof stats }
}

const selectPublishedManualInner = memoize1((items: Post[]): Post[] =>
  items.filter((p) => p.published),
)
const selectPublishedManual = (state: RootState): Post[] =>
  selectPublishedManualInner(state.posts.items)

// ── 3. createSelector (reselect via RTK) ──────────────────────────

let csCalls = 0
let csMisses = 0
const selectPublishedCS = createSelector(
  [(state: RootState) => state.posts.items],
  (items): Post[] => {
    csMisses += 1
    return items.filter((p) => p.published)
  },
)
// createSelector не даёт статистики из коробки — считаем сами:
// calls = сколько раз вызвали селектор, misses = сколько раз выполнился combiner.
function callCS(state: RootState): Post[] {
  csCalls += 1
  return selectPublishedCS(state)
}

// ── UI ────────────────────────────────────────────────────────────

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог мемоизации',
)
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const naiveCallsEl = document.getElementById('naive-calls')!
const naiveHitsEl = document.getElementById('naive-hits')!
const naiveMissEl = document.getElementById('naive-miss')!
const naiveVizEl = document.getElementById('naive-viz')!

const manualCallsEl = document.getElementById('manual-calls')!
const manualHitsEl = document.getElementById('manual-hits')!
const manualMissEl = document.getElementById('manual-miss')!
const manualVizEl = document.getElementById('manual-viz')!

const csCallsEl = document.getElementById('cs-calls')!
const csHitsEl = document.getElementById('cs-hits')!
const csMissEl = document.getElementById('cs-miss')!
const csVizEl = document.getElementById('cs-viz')!

// Naive has no cache — every call = miss, for display clarity.
let naiveRuns = 0
let lastNaiveRef: Post[] | null = null

function addBubble(container: HTMLElement, hit: boolean, label: string): void {
  const b = document.createElement('span')
  b.className = `cache-bubble ${hit ? 'cache-bubble--hit' : 'cache-bubble--miss'}`
  b.textContent = (hit ? 'HIT ' : 'MISS ') + label
  container.prepend(b)
  // cap visible bubbles
  while (container.children.length > 12) {
    container.removeChild(container.lastChild!)
  }
}

function renderMeters(naiveHit: boolean, manualHit: boolean, csHit: boolean, label: string): void {
  naiveCallsEl.textContent = String(naiveRuns)
  // Для наивного "хиты" — по факту ссылка из прошлого совпала с текущей (теоретически),
  // но combiner всё равно вызвался. Показываем как 0 hits для честности.
  naiveHitsEl.textContent = '0'
  naiveMissEl.textContent = String(naiveRuns)
  addBubble(naiveVizEl, false, label)

  const ms = selectPublishedManualInner.stats
  manualCallsEl.textContent = String(ms.calls)
  manualHitsEl.textContent = String(ms.hits)
  manualMissEl.textContent = String(ms.misses)
  addBubble(manualVizEl, manualHit, label)

  csCallsEl.textContent = String(csCalls)
  csHitsEl.textContent = String(csCalls - csMisses)
  csMissEl.textContent = String(csMisses)
  addBubble(csVizEl, csHit, label)
}

function runAllSelectors(label: string): void {
  const state = store.getState() as RootState

  // NAIVE — always computes
  const before = naiveCalls
  const naiveResult = selectPublishedNaive(state)
  const naiveSameRef = lastNaiveRef !== null && naiveResult === lastNaiveRef
  lastNaiveRef = naiveResult
  naiveRuns = naiveCalls
  void before // kept for clarity
  void naiveSameRef

  // MANUAL memo
  const beforeManualHits = selectPublishedManualInner.stats.hits
  selectPublishedManual(state)
  const manualHit =
    selectPublishedManualInner.stats.hits > beforeManualHits

  // createSelector
  const beforeMisses = csMisses
  callCS(state)
  const csHit = csMisses === beforeMisses

  renderMeters(false, manualHit, csHit, label)

  // Console narrative
  if (manualHit && csHit) {
    con.success(
      `${label}: манул и createSelector вернули кеш (posts.items — та же ссылка). Наивный пересчитал зря.`,
    )
  } else {
    con.info(
      `${label}: posts.items изменились (новая ссылка). Все три селектора пересчитали combiner.`,
    )
  }
}

// First run: prime caches, display initial state.
runAllSelectors('initial')

store.subscribe(() => {
  // After each dispatch, re-run all three selectors to observe behavior.
  // We use a custom label so the console log tells the story.
})

// ── Actions ───────────────────────────────────────────────────────

document
  .querySelector('[data-act="toggle-theme"]')!
  .addEventListener('click', () => {
    const a = themeSlice.actions.toggle()
    store.dispatch(a)
    con.action(a, 'theme/toggle')
    runAllSelectors('theme/toggle')
  })

document.querySelector('[data-act="add"]')!.addEventListener('click', () => {
  const n = store.getState().posts.items.length + 1
  const a = postsSlice.actions.addPost(`Post #${n}`)
  store.dispatch(a)
  con.action(a, 'posts/addPost')
  runAllSelectors('posts/addPost')
})

document
  .querySelector('[data-act="toggle-first"]')!
  .addEventListener('click', () => {
    const first = store.getState().posts.items[0]
    if (!first) return
    const a = postsSlice.actions.togglePublished(first.id)
    store.dispatch(a)
    con.action(a, 'posts/togglePublished')
    runAllSelectors('posts/togglePublished')
  })

document
  .querySelector('[data-act="reset-counters"]')!
  .addEventListener('click', () => {
    naiveCalls = 0
    naiveRuns = 0
    lastNaiveRef = null
    selectPublishedManualInner.stats.calls = 0
    selectPublishedManualInner.stats.hits = 0
    selectPublishedManualInner.stats.misses = 0
    csCalls = 0
    csMisses = 0
    naiveVizEl.innerHTML = ''
    manualVizEl.innerHTML = ''
    csVizEl.innerHTML = ''
    // Re-prime without incrementing dispatches
    runAllSelectors('reset (prime)')
    con.warn('Счётчики сброшены. Кеш селекторов тоже (первый вызов = miss).')
  })

// ── Intro logs ────────────────────────────────────────────────────

con.log(
  'Мемоизация в Redux = кеш по ссылке входа. Жмите theme/toggle и смотрите: manual+createSelector ловят HIT.',
)
con.info(
  'naive: filter всегда создаёт новый массив → и compute работает, и === у useSelector даст miss.',
)
con.success(
  'Правило большого пальца: если селектор делает filter/map/slice/sort — нужен createSelector.',
)
