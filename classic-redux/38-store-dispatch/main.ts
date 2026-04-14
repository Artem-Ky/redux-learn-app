import { legacy_createStore as createStore } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'
import { ConsolePanel } from '../shared/console-panel'

interface CounterState {
  value: number
}

interface IncrementedAction {
  type: 'counter/incremented'
}

interface DecrementedAction {
  type: 'counter/decremented'
}

interface ResetAction {
  type: 'counter/reset'
}

interface AddAmountAction {
  type: 'counter/addAmount'
  payload: number
}

type CounterAction =
  | IncrementedAction
  | DecrementedAction
  | ResetAction
  | AddAmountAction
  | { type: string }

const initialState: CounterState = { value: 0 }

function counterReducer(state: CounterState = initialState, action: CounterAction): CounterState {
  switch (action.type) {
    case 'counter/incremented':
      return { ...state, value: state.value + 1 }
    case 'counter/decremented':
      return { ...state, value: state.value - 1 }
    case 'counter/reset':
      return { ...state, value: 0 }
    case 'counter/addAmount':
      return { ...state, value: state.value + (action as AddAmountAction).payload }
    default:
      return state
  }
}

const store = createStore(counterReducer)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

const stateDisplay = document.getElementById('state-display')!
const returnDisplay = document.getElementById('return-display')!

function updateDisplay(): void {
  stateDisplay.textContent = JSON.stringify(store.getState(), null, 2)
}

updateDisplay()
consolePanel.info('Store создан. Начальный state:')
consolePanel.log(JSON.stringify(store.getState()))

function dispatchAndLog(action: CounterAction): void {
  consolePanel.log(`→ dispatch(${JSON.stringify(action)})`)

  const returned = store.dispatch(action)

  consolePanel.log(`  возврат dispatch: ${JSON.stringify(returned)}`)
  consolePanel.log(`  getState(): ${JSON.stringify(store.getState())}`)

  returnDisplay.textContent = JSON.stringify(returned, null, 2)
  updateDisplay()
}

document.getElementById('btn-increment')!.addEventListener('click', (): void => {
  dispatchAndLog({ type: 'counter/incremented' })
})

document.getElementById('btn-decrement')!.addEventListener('click', (): void => {
  dispatchAndLog({ type: 'counter/decremented' })
})

document.getElementById('btn-reset')!.addEventListener('click', (): void => {
  dispatchAndLog({ type: 'counter/reset' })
})

document.getElementById('btn-add-amount')!.addEventListener('click', (): void => {
  const input = document.getElementById('amount-input') as HTMLInputElement
  const amount = Number(input.value) || 0
  dispatchAndLog({ type: 'counter/addAmount', payload: amount })
})
