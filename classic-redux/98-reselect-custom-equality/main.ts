import { createSelector, createSelectorCreator, lruMemoize } from 'reselect'
import { legacy_createStore as createStore } from 'redux'
import { ConsolePanel } from '../shared/console-panel'

// ─── Interfaces ───

interface Item {
  id: number
  name: string
  price: number
  active: boolean
}

interface AppState {
  items: Item[]
  version: number
}

interface SetItemsAction { type: 'items/set'; payload: Item[] }
interface BumpVersionAction { type: 'version/bump' }
interface ResetAction { type: 'reset' }

type AppAction = SetItemsAction | BumpVersionAction | ResetAction | { type: string }

const defaultItems: Item[] = [
  { id: 1, name: 'Redux', price: 100, active: true },
  { id: 2, name: 'Immer', price: 50, active: true },
  { id: 3, name: 'Reselect', price: 75, active: false }
]

const initialState: AppState = {
  items: [...defaultItems],
  version: 0
}

function reducer(state: AppState = initialState, action: AppAction): AppState {
  switch (action.type) {
    case 'items/set':
      return { ...state, items: (action as SetItemsAction).payload, version: state.version + 1 }
    case 'version/bump':
      return { ...state, version: state.version + 1 }
    case 'reset':
      return { ...initialState, items: [...defaultItems] }
    default:
      return state
  }
}

const store = createStore(reducer)

// ─── Recomputation counters ───

let defaultRecomputations = 0
let customRecomputations = 0

// ─── Selectors ───

const selectActiveItemsDefault = (state: AppState): Item[] =>
  state.items.filter(i => i.active)

const selectActiveItemsCustom = (state: AppState): Item[] =>
  state.items.filter(i => i.active)

const selectTotalDefault = createSelector(
  [selectActiveItemsDefault],
  (items: Item[]): number => {
    defaultRecomputations++
    return items.reduce((sum, i) => sum + i.price, 0)
  }
)

const deepEqual = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a) === JSON.stringify(b)

const createDeepEqualSelector = createSelectorCreator({
  memoize: lruMemoize,
  memoizeOptions: [{ equalityCheck: deepEqual }],
  argsMemoize: lruMemoize,
  argsMemoizeOptions: [{ equalityCheck: deepEqual }]
})

const selectTotalCustom = createDeepEqualSelector(
  [selectActiveItemsCustom],
  (items: Item[]): number => {
    customRecomputations++
    return items.reduce((sum, i) => sum + i.price, 0)
  }
)

// ─── UI ───

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

const counterDefaultEl = document.getElementById('counter-default')!
const counterCustomEl = document.getElementById('counter-custom')!
const stateDisplay = document.getElementById('state-display')!

const btnSameData = document.getElementById('btn-same-data')!
const btnNewData = document.getElementById('btn-new-data')!
const btnMany = document.getElementById('btn-many')!
const btnReset = document.getElementById('btn-reset')!

function render(): void {
  const state = store.getState() as AppState
  stateDisplay.textContent = JSON.stringify(state, null, 2)
  counterDefaultEl.textContent = String(defaultRecomputations)
  counterCustomEl.textContent = String(customRecomputations)
}

function runBothSelectors(): void {
  const state = store.getState() as AppState
  const resultDefault = selectTotalDefault(state)
  const resultCustom = selectTotalCustom(state)
  void resultDefault
  void resultCustom
}

runBothSelectors()
render()

consolePanel.info('Reselect: кастомные проверки равенства')
consolePanel.log('')
consolePanel.log('Default === : перевычисляет при каждой новой ссылке.')
consolePanel.log('Custom deep : перевычисляет только при реальном изменении данных.')
consolePanel.log('')

// ─── Dispatch same data (new reference) ───

btnSameData.addEventListener('click', (): void => {
  const state = store.getState() as AppState
  const sameItems = state.items.map(i => ({ ...i }))

  const prevDefault = defaultRecomputations
  const prevCustom = customRecomputations

  store.dispatch({ type: 'items/set', payload: sameItems })
  runBothSelectors()
  render()

  const dDefault = defaultRecomputations - prevDefault
  const dCustom = customRecomputations - prevCustom

  consolePanel.warn('━━━ Dispatch: те же данные, новая ссылка ━━━')
  consolePanel.log('items.map(i => ({...i})) — структурно идентичны, но === false')
  consolePanel.log('')
  consolePanel.error(`  Default (===):  +${dDefault} перевычисление${dDefault !== 1 ? 'й' : ''}`)
  consolePanel.success(`  Custom (deep):  +${dCustom} перевычисление${dCustom !== 1 ? 'й' : ''}`)
  consolePanel.log('')
})

// ─── Dispatch new data ───

btnNewData.addEventListener('click', (): void => {
  const state = store.getState() as AppState
  const newItems = state.items.map(i => ({
    ...i,
    price: i.price + Math.round(Math.random() * 20)
  }))

  const prevDefault = defaultRecomputations
  const prevCustom = customRecomputations

  store.dispatch({ type: 'items/set', payload: newItems })
  runBothSelectors()
  render()

  const dDefault = defaultRecomputations - prevDefault
  const dCustom = customRecomputations - prevCustom

  consolePanel.warn('━━━ Dispatch: новые данные (цены изменены) ━━━')
  consolePanel.log('Оба селектора должны перевычислить.')
  consolePanel.log('')
  consolePanel.info(`  Default (===):  +${dDefault} перевычисление`)
  consolePanel.info(`  Custom (deep):  +${dCustom} перевычисление`)
  consolePanel.log('')
})

// ─── 10x dispatch same data ───

btnMany.addEventListener('click', (): void => {
  const state = store.getState() as AppState
  const prevDefault = defaultRecomputations
  const prevCustom = customRecomputations

  for (let i = 0; i < 10; i++) {
    const sameItems = state.items.map(item => ({ ...item }))
    store.dispatch({ type: 'items/set', payload: sameItems })
    runBothSelectors()
  }

  render()

  const dDefault = defaultRecomputations - prevDefault
  const dCustom = customRecomputations - prevCustom

  consolePanel.warn('━━━ 10x Dispatch: те же данные, новые ссылки ━━━')
  consolePanel.log('')
  consolePanel.error(`  Default (===):  +${dDefault} перевычислений (каждый раз!)`)
  consolePanel.success(`  Custom (deep):  +${dCustom} перевычислений (кэш работает!)`)
  consolePanel.log('')
  consolePanel.info(`  Итого: Default ${defaultRecomputations} vs Custom ${customRecomputations}`)
  consolePanel.log('')
})

// ─── Reset ───

btnReset.addEventListener('click', (): void => {
  store.dispatch({ type: 'reset' })
  defaultRecomputations = 0
  customRecomputations = 0
  selectTotalDefault.clearCache()
  selectTotalCustom.clearCache()
  runBothSelectors()
  render()
  consolePanel.clear()
  consolePanel.info('Сброшено')
  consolePanel.log('')
})
