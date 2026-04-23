import {
  configureStore,
  createEntityAdapter,
  createSlice,
  nanoid,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── Live demo store ─────────────────────────────────────────
interface Product {
  id: string
  title: string
  price: number
}

const productsAdapter = createEntityAdapter<Product>()

const productsSlice = createSlice({
  name: 'products',
  initialState: productsAdapter.getInitialState(undefined, [
    { id: 'p1', title: 'Книга "Clean Code"', price: 40 },
    { id: 'p2', title: 'Ноутбук', price: 1200 },
  ]),
  reducers: {
    added: productsAdapter.addOne,
    upserted: productsAdapter.upsertOne,
    cleared: productsAdapter.removeAll,
  },
})

const store = configureStore({ reducer: { products: productsSlice.reducer } })

// ── Bench ───────────────────────────────────────────────────
interface Item { id: number; payload: string }

function makeArray(n: number): Item[] {
  const arr: Item[] = new Array(n)
  for (let i = 0; i < n; i++) arr[i] = { id: i, payload: `item-${i}` }
  return arr
}

function makeTable(n: number): { ids: number[]; entities: Record<number, Item> } {
  const ids = new Array<number>(n)
  const entities: Record<number, Item> = {}
  for (let i = 0; i < n; i++) {
    ids[i] = i
    entities[i] = { id: i, payload: `item-${i}` }
  }
  return { ids, entities }
}

function runBench(n: number, lookups: number): { arr: number; tbl: number } {
  const arr = makeArray(n)
  const tbl = makeTable(n)
  const keys = new Array<number>(lookups)
  for (let i = 0; i < lookups; i++) keys[i] = Math.floor(Math.random() * n)

  // Array.find
  const t1 = performance.now()
  let sink1 = 0
  for (let i = 0; i < lookups; i++) {
    const found = arr.find((x) => x.id === keys[i])
    if (found) sink1 += found.id
  }
  const t2 = performance.now()

  // entities[id]
  const t3 = performance.now()
  let sink2 = 0
  for (let i = 0; i < lookups; i++) {
    const found = tbl.entities[keys[i]]
    if (found) sink2 += found.id
  }
  const t4 = performance.now()

  void sink1
  void sink2

  return { arr: t2 - t1, tbl: t4 - t3 }
}

// ── UI ──────────────────────────────────────────────────────
const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — EntityAdapter как cache-таблица',
)
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const stateOut = document.getElementById('state-out')!
function render(): void {
  stateOut.textContent = JSON.stringify(store.getState(), null, 2)
}
render()
store.subscribe(render)

document.getElementById('btn-run')!.addEventListener('click', () => {
  const n = Number((document.getElementById('n-records') as HTMLInputElement).value)
  const lookups = Number((document.getElementById('n-lookups') as HTMLInputElement).value)
  const { arr, tbl } = runBench(n, lookups)
  ;(document.getElementById('val-array') as HTMLElement).textContent = `${arr.toFixed(2)} ms`
  ;(document.getElementById('val-table') as HTMLElement).textContent = `${tbl.toFixed(2)} ms`
  const ratio = arr / Math.max(tbl, 0.001)
  ;(document.getElementById('ratio') as HTMLElement).textContent =
    `EntityState быстрее в ${ratio.toFixed(1)}× (n=${n}, lookups=${lookups})`
  con.log(
    `bench: N=${n}, lookups=${lookups} → array ${arr.toFixed(2)}ms, table ${tbl.toFixed(2)}ms. Ratio ${ratio.toFixed(1)}×`,
  )
})

document.getElementById('btn-clear')!.addEventListener('click', () => {
  ;(document.getElementById('val-array') as HTMLElement).textContent = '— ms'
  ;(document.getElementById('val-table') as HTMLElement).textContent = '— ms'
  ;(document.getElementById('ratio') as HTMLElement).textContent = '—'
})

document.getElementById('btn-add')!.addEventListener('click', () => {
  const id = nanoid(4)
  store.dispatch(
    productsSlice.actions.added({ id, title: `Product ${id}`, price: Math.round(Math.random() * 500) }),
  )
  con.log(`addOne('${id}') — O(1) вставка в entities + ids.push`)
})

document.getElementById('btn-upsert-1')!.addEventListener('click', () => {
  const newPrice = Math.round(Math.random() * 1000)
  store.dispatch(productsSlice.actions.upserted({ id: 'p1', price: newPrice, title: 'Clean Code (upserted)' }))
  con.success(`upsertOne(p1, price=${newPrice}) — shallow merge. title тоже обновлён. O(1).`)
})

document.getElementById('btn-get-1')!.addEventListener('click', () => {
  const state = store.getState().products
  const found = state.entities['p1']
  if (found) {
    con.info(`entities['p1'] = ${JSON.stringify(found)} — O(1) cache hit`)
  } else {
    con.warn(`entities['p1'] = undefined — cache miss`)
  }
})

document.getElementById('btn-clear-store')!.addEventListener('click', () => {
  store.dispatch(productsSlice.actions.cleared())
  con.warn('removeAll — весь кэш очищен за один O(n) reset')
})

con.log('Сценарий: 1) Запусти bench — увидишь 30–100× разницу на N=10k. 2) Поиграй с live-store ниже.')
con.info('Adapter хранит ids (порядок) и entities (хеш). Селекторы всегда бьют в entities по ключу.')
