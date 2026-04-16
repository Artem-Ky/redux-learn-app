import { legacy_createStore as createStore, applyMiddleware } from 'redux'
import { ConsolePanel } from '../shared/console-panel'

interface CounterState {
  value: number
}

interface IncrementAction {
  type: 'counter/incremented'
}

interface DecrementAction {
  type: 'counter/decremented'
}

interface ResetAction {
  type: 'counter/reset'
}

type CounterAction =
  | IncrementAction
  | DecrementAction
  | ResetAction
  | { type: string }

function counterReducer(state: CounterState = { value: 0 }, action: CounterAction): CounterState {
  switch (action.type) {
    case 'counter/incremented':
      return { value: state.value + 1 }
    case 'counter/decremented':
      return { value: state.value - 1 }
    case 'counter/reset':
      return { value: 0 }
    default:
      return state
  }
}

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

const enrichMiddleware =
  (storeAPI: any) => (next: any) => (action: any): any => {
    const original = { ...action }

    const enrichedAction = {
      ...action,
      timestamp: Date.now(),
      meta: { source: 'user' }
    }

    consolePanel.log(`📤 Original:  ${JSON.stringify(original)}`)
    consolePanel.success(`📦 Enriched:  ${JSON.stringify(enrichedAction)}`)

    const enrichedEl = document.getElementById('enriched-display')!
    enrichedEl.textContent = JSON.stringify(enrichedAction, null, 2)

    return next(enrichedAction)
  }

const store = createStore(counterReducer, applyMiddleware(enrichMiddleware))

consolePanel.success('Store создан с enrichMiddleware')
consolePanel.info('Каждый action получит timestamp и meta: { source: "user" }')

function render(): void {
  const state = store.getState() as CounterState
  document.getElementById('state-display')!.textContent = JSON.stringify(state, null, 2)
}

store.subscribe(render)
render()

document.getElementById('btn-increment')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'counter/incremented' })
})

document.getElementById('btn-decrement')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'counter/decremented' })
})

document.getElementById('btn-reset')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'counter/reset' })
})
