import {
  combineReducers,
  configureStore,
  createEntityAdapter,
  createSlice,
  type Reducer,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface Book {
  id: string
  title: string
  price: number
}

const booksAdapter = createEntityAdapter<Book>()

const SEED: Book[] = [
  { id: 'b1', title: 'Clean Code', price: 35 },
  { id: 'b2', title: 'Refactoring', price: 40 },
  { id: 'b3', title: 'DDD', price: 55 },
  { id: 'b4', title: 'Patterns', price: 45 },
]

const booksSlice = createSlice({
  name: 'books',
  initialState: booksAdapter.getInitialState(undefined, SEED),
  reducers: {
    bookAdded: booksAdapter.addOne,
  },
})

// ── Переключаемые reducers: flat vs nested ─────────
const flatReducer = combineReducers({ books: booksSlice.reducer })
const nestedReducer = combineReducers({
  library: combineReducers({ books: booksSlice.reducer }),
})

const store = configureStore({ reducer: flatReducer })
let nested = false

// ── Два набора селекторов ──────────────────────────
// ① local: принимают ровно EntityState
const localSelectors = booksAdapter.getSelectors()

// ② globalized: принимают RootState и сами лезут в .books
//   Пересоздаём при переключении пути.
type AnyState = Record<string, unknown>
let globalSelectors = booksAdapter.getSelectors((s: AnyState) => {
  const flat = s as { books?: ReturnType<typeof booksSlice.reducer> }
  return flat.books!
})

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог getSelectors()',
)
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

// ── DOM ────────────────────────────────────────────
const outLocal = document.getElementById('out-local')!
const outGlobal = document.getElementById('out-global')!
const callLog = document.getElementById('call-log')!
const currentPath = document.getElementById('current-path')!

function getBooksState(): ReturnType<typeof booksSlice.reducer> {
  const s = store.getState() as AnyState
  if (nested) {
    return (s.library as AnyState).books as ReturnType<typeof booksSlice.reducer>
  }
  return s.books as ReturnType<typeof booksSlice.reducer>
}

function fmt(v: unknown): string {
  return JSON.stringify(v, null, 2)
}

document.getElementById('call-local')!.addEventListener('click', () => {
  const subState = getBooksState()
  const all = localSelectors.selectAll(subState)
  outLocal.textContent = fmt(all)
  callLog.textContent = `localSelectors.selectAll(subState) — принял EntityState напрямую, вернул ${all.length} book(s)`
  con.success(`local.selectAll(subState) → ${all.length} элементов`)
})

document.getElementById('call-global')!.addEventListener('click', () => {
  try {
    const all = globalSelectors.selectAll(store.getState() as AnyState)
    outGlobal.textContent = fmt(all)
    callLog.textContent = `globalSelectors.selectAll(state) — принял RootState, сам достал подстейт, вернул ${all.length}`
    con.success(`global.selectAll(state) → ${all.length} элементов`)
  } catch (e) {
    outGlobal.textContent = 'TypeError — глобальные селекторы ожидают старый путь.'
    callLog.textContent = `❌ globalSelectors упали: ${(e as Error).message}`
    con.error('global селекторы привязаны к старому пути — нужно пересоздать!')
  }
})

document.getElementById('call-by-id')!.addEventListener('click', () => {
  try {
    const res = globalSelectors.selectById(store.getState() as AnyState, 'b2')
    outGlobal.textContent = fmt(res)
    callLog.textContent = `globalSelectors.selectById(state, "b2") → ${JSON.stringify(res)}`
    con.info('selectById кешируется по [entities, id]. Cache size = 1 (createDraftSafeSelector).')
  } catch {
    con.error('Селекторы привязаны к старому пути.')
  }
})

document.getElementById('call-total')!.addEventListener('click', () => {
  try {
    const total = globalSelectors.selectTotal(store.getState() as AnyState)
    outGlobal.textContent = `total = ${total}`
    callLog.textContent = `globalSelectors.selectTotal(state) = ${total}`
  } catch {
    con.error('Селекторы привязаны к старому пути.')
  }
})

document.getElementById('stress')!.addEventListener('click', () => {
  // вызовем selectById с тремя разными id — каждый раз cache size=1 invalidates
  const state = store.getState() as AnyState
  con.warn('Вызов selectById с 3 разными id подряд — cache size=1 invalidates каждый раз.')
  const a = globalSelectors.selectById(state, 'b1')
  const b = globalSelectors.selectById(state, 'b2')
  const c = globalSelectors.selectById(state, 'b1') // тот же id, что первый — кэш уже потерян
  con.log(`selectById('b1') → ${JSON.stringify(a)}`)
  con.log(`selectById('b2') → ${JSON.stringify(b)}`)
  con.log(`selectById('b1') ← заново пересчитано (cache mismatch)`)
  outGlobal.textContent = `b1 → ${JSON.stringify(a)}\nb2 → ${JSON.stringify(b)}\nb1 → ${JSON.stringify(c)}`
  callLog.textContent = `3 вызова selectById с меняющимся id → cache size=1 не успевает. См. теорию (weakMapMemoize).`
})

document.getElementById('move-flat')!.addEventListener('click', () => {
  if (!nested) {
    con.info('Уже flat.')
    return
  }
  nested = false
  store.replaceReducer(flatReducer)
  // пересоздать globalized с flat-путём
  globalSelectors = booksAdapter.getSelectors((s: AnyState) => (s as { books?: ReturnType<typeof booksSlice.reducer> }).books!)
  currentPath.textContent = 'state.books'
  con.success('flat: reducer + globalSelectors пересозданы под state.books.')
})

document.getElementById('move-nested')!.addEventListener('click', () => {
  if (nested) {
    con.info('Уже nested.')
    return
  }
  nested = true
  store.replaceReducer(nestedReducer as unknown as Reducer<ReturnType<typeof flatReducer>>)
  globalSelectors = booksAdapter.getSelectors((s: AnyState) => {
    const v = s as { library?: { books?: ReturnType<typeof booksSlice.reducer> } }
    return v.library!.books!
  })
  currentPath.textContent = 'state.library.books'
  con.warn('nested: replaceReducer вложил слой library.')
  con.info('globalSelectors пересозданы: теперь s => s.library.books. Старые — УПАЛИ БЫ.')
})

con.log('localSelectors = booksAdapter.getSelectors() — принимают EntityState напрямую.')
con.log('globalSelectors = booksAdapter.getSelectors(s => s.books) — принимают RootState.')
con.info('Нажми ① и ② — увидишь одни и те же данные разными путями.')
con.info('Нажми "💥 stress" чтобы посмотреть на cache size=1 gotcha.')
