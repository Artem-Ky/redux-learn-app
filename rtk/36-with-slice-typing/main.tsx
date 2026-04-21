import {
  configureStore,
  createSlice,
  combineSlices,
  type WithSlice,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface CoreState { ready: boolean }
interface ChartState { points: number[] }
interface CartState { items: string[] }

const coreSlice = createSlice({
  name: 'core',
  initialState: { ready: true } as CoreState,
  reducers: {},
})

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

type LazyLoadedSlices = WithSlice<typeof chartSlice> & WithSlice<typeof cartSlice>

const rootReducer = combineSlices(coreSlice).withLazyLoadedSlices<LazyLoadedSlices>()

type RootState = ReturnType<typeof rootReducer>

const store = configureStore({ reducer: rootReducer })

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог WithSlice')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const tsTypesEl = document.getElementById('ts-types-out')!
const stateEl = document.getElementById('state-out')!

tsTypesEl.textContent = `// LazyLoadedSlices = WithSlice<typeof chartSlice> & WithSlice<typeof cartSlice>
//                  = { chart?: ChartState } & { cart?: CartState }

// type RootState = ReturnType<typeof rootReducer>
// =>
{
  core:  CoreState           // обязательное (всегда есть)
  chart?: ChartState         // опциональное (lazy)
  cart?:  CartState          // опциональное (lazy)
}

// В селекторах TS заставит писать optional chaining:
const selectPoints = (state: RootState) => state.chart?.points ?? []
const selectItems  = (state: RootState) => state.cart?.items ?? []`

let injectedChart: ReturnType<typeof chartSlice.injectInto> | null = null
let injectedCart: ReturnType<typeof cartSlice.injectInto> | null = null

function render(): void {
  const s = store.getState() as RootState
  stateEl.textContent = JSON.stringify(s, null, 2)
}
render()
store.subscribe(render)

document.getElementById('inject-chart')!.addEventListener('click', () => {
  if (!injectedChart) {
    injectedChart = chartSlice.injectInto(rootReducer)
    store.dispatch({ type: '@@INIT/chart' })
    con.success('chartSlice injected → state.chart теперь существует')
  } else {
    con.warn('chart уже injected')
  }
})

document.getElementById('inject-cart')!.addEventListener('click', () => {
  if (!injectedCart) {
    injectedCart = cartSlice.injectInto(rootReducer)
    store.dispatch({ type: '@@INIT/cart' })
    con.success('cartSlice injected → state.cart теперь существует')
  } else {
    con.warn('cart уже injected')
  }
})

document.getElementById('add-point')!.addEventListener('click', () => {
  if (!injectedChart) { con.warn('сначала inject chartSlice'); return }
  const a = injectedChart.actions.addPoint(Math.floor(Math.random() * 100))
  store.dispatch(a); con.action(a)
})

document.getElementById('add-cart')!.addEventListener('click', () => {
  if (!injectedCart) { con.warn('сначала inject cartSlice'); return }
  const a = injectedCart.actions.add(`Item-${Date.now() % 1000}`)
  store.dispatch(a); con.action(a)
})

document.querySelector<HTMLButtonElement>('[data-do="check"]')!.addEventListener('click', () => {
  const s = store.getState() as RootState
  const safeAccess = s.chart?.points ?? []
  con.info(`state.chart = ${JSON.stringify(s.chart)}`)
  con.info(`safe state.chart?.points ?? [] = ${JSON.stringify(safeAccess)}`)
  if (s.chart === undefined) {
    con.warn('TS заставил писать ?., потому что chart не injected')
  } else {
    con.success(`chart injected, state.chart типобезопасен (${s.chart.points.length} точек)`)
  }
})

con.log('WithSlice<typeof chartSlice> = { chart?: ChartState } — опциональное поле.')
con.info('TS требует optional chaining ?. в селекторах для lazy-полей.')
con.success('Всё runtime безопасно: до inject слайса state.chart === undefined.')
