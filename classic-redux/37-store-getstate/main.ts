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

type CounterAction =
  | IncrementedAction
  | DecrementedAction
  | ResetAction
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
    default:
      return state
  }
}

const store = createStore(counterReducer)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

const stateDisplay = document.getElementById('state-display')!
const refCheck = document.getElementById('ref-check')!

function updateDisplay(): void {
  stateDisplay.textContent = JSON.stringify(store.getState(), null, 2)
}

updateDisplay()
consolePanel.info('store создан. Начальный getState():')
consolePanel.log(JSON.stringify(store.getState()))

function dispatchAndLog(action: CounterAction): void {
  const stateBefore = store.getState()
  store.dispatch(action)
  const stateAfter = store.getState()

  const sameRef = stateBefore === stateAfter

  consolePanel.log(`dispatch({ type: '${action.type}' })`)
  consolePanel.log(`  getState() → ${JSON.stringify(stateAfter)}`)
  consolePanel.log(`  stateBefore === stateAfter → ${sameRef}`)

  refCheck.textContent =
    `stateBefore: ${JSON.stringify(stateBefore)}\n` +
    `stateAfter:  ${JSON.stringify(stateAfter)}\n` +
    `stateBefore === stateAfter → ${sameRef}`
  refCheck.style.color = sameRef ? 'var(--accent-orange)' : 'var(--success)'

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
