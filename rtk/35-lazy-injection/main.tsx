import {
  configureStore,
  createSlice,
  combineSlices,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

const coreSlice = createSlice({
  name: 'core',
  initialState: { count: 0 },
  reducers: { increment: (s) => { s.count += 1 } },
})

interface ChartState { points: number[] }
interface CartState { items: string[] }
interface SearchState { query: string }

interface LazyState {
  chart?: ChartState
  cart?: CartState
  search?: SearchState
}

const rootReducer = combineSlices(coreSlice).withLazyLoadedSlices<LazyState>()

const store = configureStore({ reducer: rootReducer })

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог lazy injection')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const chartSlice = createSlice({
  name: 'chart',
  initialState: { points: [] } as ChartState,
  reducers: { addPoint: (s, a: PayloadAction<number>) => { s.points.push(a.payload) } },
})

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [] } as CartState,
  reducers: { add: (s, a: PayloadAction<string>) => { s.items.push(a.payload) } },
})

const searchSlice = createSlice({
  name: 'search',
  initialState: { query: '' } as SearchState,
  reducers: { set: (s, a: PayloadAction<string>) => { s.query = a.payload } },
})

const injected = {
  chart: false,
  cart: false,
  search: false,
}
let injectedChart: ReturnType<typeof chartSlice.injectInto> | null = null
let injectedCart: ReturnType<typeof cartSlice.injectInto> | null = null
let injectedSearch: ReturnType<typeof searchSlice.injectInto> | null = null

const slicesEl = document.getElementById('slices-list')!
const stateEl = document.getElementById('state-out')!

function render(): void {
  const rows = [
    { name: 'core',   status: 'core',     ok: true },
    { name: 'chart',  status: injected.chart  ? 'injected' : 'missing', ok: injected.chart },
    { name: 'cart',   status: injected.cart   ? 'injected' : 'missing', ok: injected.cart },
    { name: 'search', status: injected.search ? 'injected' : 'missing', ok: injected.search },
  ]
  slicesEl.innerHTML = rows.map((r) => `
    <div class="injected-row">
      <span class="injected-row__name">state.${r.name}</span>
      <span class="injected-row__status--${r.status}">
        ${r.status === 'core' ? 'CORE (всегда есть)' : r.status === 'injected' ? '✓ INJECTED' : '✗ NOT INJECTED'}
      </span>
    </div>`).join('')
  stateEl.textContent = JSON.stringify(store.getState(), null, 2)
}
render()
store.subscribe(render)

document.getElementById('inject-chart')!.addEventListener('click', () => {
  if (injected.chart) { con.warn('chart уже injected'); return }
  injectedChart = chartSlice.injectInto(rootReducer)
  injected.chart = true
  store.dispatch({ type: '@@INIT_INJECTED/chart' })
  con.success('chartSlice.injectInto(rootReducer) → state.chart появился')
  render()
})

document.getElementById('inject-cart')!.addEventListener('click', () => {
  if (injected.cart) { con.warn('cart уже injected'); return }
  injectedCart = cartSlice.injectInto(rootReducer)
  injected.cart = true
  store.dispatch({ type: '@@INIT_INJECTED/cart' })
  con.success('cartSlice.injectInto(rootReducer) → state.cart появился')
  render()
})

document.getElementById('inject-search')!.addEventListener('click', () => {
  if (injected.search) { con.warn('search уже injected'); return }
  injectedSearch = searchSlice.injectInto(rootReducer)
  injected.search = true
  store.dispatch({ type: '@@INIT_INJECTED/search' })
  con.success('searchSlice.injectInto(rootReducer) → state.search появился')
  render()
})

document.querySelectorAll<HTMLButtonElement>('[data-do]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const op = btn.dataset.do!
    try {
      if (op === 'inc') {
        const a = coreSlice.actions.increment(); store.dispatch(a); con.action(a)
      } else if (op === 'point') {
        if (!injectedChart) { con.warn('сначала inject chartSlice'); return }
        const a = injectedChart.actions.addPoint(Math.floor(Math.random() * 100))
        store.dispatch(a); con.action(a)
      } else if (op === 'add') {
        if (!injectedCart) { con.warn('сначала inject cartSlice'); return }
        const a = injectedCart.actions.add('Apple')
        store.dispatch(a); con.action(a)
      } else if (op === 'search') {
        if (!injectedSearch) { con.warn('сначала inject searchSlice'); return }
        const a = injectedSearch.actions.set('rtk lazy load')
        store.dispatch(a); con.action(a)
      }
    } catch (e) {
      con.warn(`Error: ${(e as Error).message}`)
    }
  })
})

con.log('Старт: только core slice. chart, cart, search — НЕ injected.')
con.info('Нажмите "inject" чтобы добавить slice в runtime — увидите как state растёт.')
con.success('В реальном проекте injectInto вызывается из dynamic import.')
