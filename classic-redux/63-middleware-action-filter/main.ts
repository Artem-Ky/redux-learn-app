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

const BLOCKED_ACTIONS: string[] = ['counter/reset']

const actionFilterMiddleware =
  (storeAPI: any) => (next: any) => (action: any): any => {
    if (BLOCKED_ACTIONS.includes(action.type)) {
      consolePanel.error(`🚫 BLOCKED: ${action.type}`)
      consolePanel.warn(`   Action ${action.type} не был передан в reducer`)
      return undefined
    }

    consolePanel.success(`✅ ALLOWED: ${action.type}`)
    return next(action)
  }

const store = createStore(counterReducer, applyMiddleware(actionFilterMiddleware))

consolePanel.success('Store создан с actionFilterMiddleware')
consolePanel.info(`Заблокированные action'ы: ${JSON.stringify(BLOCKED_ACTIONS)}`)
consolePanel.info('Нажмите «+1» или «−1» — пройдут. «Reset» — заблокирован!')

function render(): void {
  const state = store.getState() as CounterState
  document.getElementById('state-display')!.textContent = JSON.stringify(state, null, 2)
}

store.subscribe(render)
render()

document.getElementById('btn-increment')!.addEventListener('click', (): void => {
  consolePanel.log(`dispatch({ type: 'counter/incremented' })`)
  store.dispatch({ type: 'counter/incremented' })
})

document.getElementById('btn-decrement')!.addEventListener('click', (): void => {
  consolePanel.log(`dispatch({ type: 'counter/decremented' })`)
  store.dispatch({ type: 'counter/decremented' })
})

document.getElementById('btn-reset')!.addEventListener('click', (): void => {
  consolePanel.log(`dispatch({ type: 'counter/reset' }) — попытка сброса...`)
  store.dispatch({ type: 'counter/reset' })
})
