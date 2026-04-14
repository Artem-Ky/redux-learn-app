import { legacy_createStore as createStore } from 'redux'
import { ConsolePanel } from '../shared/console-panel'

interface CounterState {
  value: number
}

interface CounterAction {
  type: string
  payload?: number
}

const initialState: CounterState = { value: 0 }

function counterReducer(
  state: CounterState = initialState,
  action: CounterAction
): CounterState {
  switch (action.type) {
    case 'counter/incremented':
      return { ...state, value: state.value + 1 }
    case 'counter/decremented':
      return { ...state, value: state.value - 1 }
    case 'counter/addAmount':
      return { ...state, value: state.value + (action.payload ?? 0) }
    default:
      return state
  }
}

const actions: CounterAction[] = [
  { type: 'counter/incremented' },
  { type: 'counter/incremented' },
  { type: 'counter/incremented' },
  { type: 'counter/addAmount', payload: 5 },
  { type: 'counter/decremented' },
  { type: 'counter/addAmount', payload: 10 },
]

const store = createStore(counterReducer)

const con = new ConsolePanel(document.getElementById('console-container')!, 'Пошаговый reduce')

let reduceResult: CounterState | null = null
let storeResult: CounterState | null = null

function checkMatch(): void {
  const el = document.getElementById('match-result')!
  if (reduceResult && storeResult) {
    const match = reduceResult.value === storeResult.value
    el.textContent = match
      ? `✔ Результаты совпадают! value = ${reduceResult.value}`
      : `✖ Не совпадают: reduce=${reduceResult.value}, store=${storeResult.value}`
    el.style.color = match ? 'var(--success)' : 'var(--error)'
  }
}

document.getElementById('btn-run-reduce')!.addEventListener('click', (): void => {
  con.info('─── Array.reduce() — пошагово ───')
  con.log(`Начальное состояние: { value: ${initialState.value} }`)

  reduceResult = actions.reduce((acc: CounterState, action: CounterAction, index: number) => {
    const newState = counterReducer(acc, action)
    const actionStr = action.payload !== undefined
      ? `{ type: "${action.type}", payload: ${action.payload} }`
      : `{ type: "${action.type}" }`
    con.log(`Шаг ${index + 1}: ${actionStr}`)
    con.success(`  acc = { value: ${acc.value} } → { value: ${newState.value} }`)
    return newState
  }, initialState)

  con.info(`Итого: { value: ${reduceResult.value} }`)
  con.log('')
  document.getElementById('reduce-result')!.textContent = JSON.stringify(reduceResult, null, 2)
  checkMatch()
})

document.getElementById('btn-run-dispatch')!.addEventListener('click', (): void => {
  con.info('─── Redux store.dispatch() — пошагово ───')
  con.log(`Начальное состояние: ${JSON.stringify(store.getState())}`)

  actions.forEach((action, index) => {
    const before = store.getState()
    store.dispatch(action)
    const after = store.getState()
    const actionStr = action.payload !== undefined
      ? `{ type: "${action.type}", payload: ${action.payload} }`
      : `{ type: "${action.type}" }`
    con.log(`Dispatch ${index + 1}: ${actionStr}`)
    con.success(`  state: { value: ${before.value} } → { value: ${after.value} }`)
  })

  storeResult = store.getState()
  con.info(`Итого: ${JSON.stringify(storeResult)}`)
  con.log('')
  document.getElementById('store-result')!.textContent = JSON.stringify(storeResult, null, 2)
  checkMatch()
})

document.getElementById('btn-reset')!.addEventListener('click', (): void => {
  reduceResult = null
  storeResult = null
  document.getElementById('reduce-result')!.textContent = '—'
  document.getElementById('store-result')!.textContent = '—'
  const el = document.getElementById('match-result')!
  el.textContent = 'Нажмите обе кнопки'
  el.style.color = 'var(--text-muted)'
  con.clear()
  con.info('Сброшено. Нажмите кнопки снова.')
})

con.info('Нажмите кнопки, чтобы сравнить Array.reduce() и Redux store.dispatch()')
con.log('Один и тот же reducer, один и тот же набор экшенов — результат одинаковый!')
