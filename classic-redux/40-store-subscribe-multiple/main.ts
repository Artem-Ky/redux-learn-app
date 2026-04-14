import { legacy_createStore as createStore } from 'redux'
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

interface AddAmountAction {
  type: 'counter/addAmount'
  payload: number
}

interface ResetAction {
  type: 'counter/reset'
}

type CounterAction =
  | IncrementedAction
  | DecrementedAction
  | AddAmountAction
  | ResetAction
  | { type: string }

const initialState: CounterState = { value: 0 }

let lastActionType = '@@INIT'

function counterReducer(state: CounterState = initialState, action: CounterAction): CounterState {
  lastActionType = action.type
  switch (action.type) {
    case 'counter/incremented':
      return { ...state, value: state.value + 1 }
    case 'counter/decremented':
      return { ...state, value: state.value - 1 }
    case 'counter/addAmount':
      return { ...state, value: state.value + (action as AddAmountAction).payload }
    case 'counter/reset':
      return { ...state, value: 0 }
    default:
      return state
  }
}

const store = createStore(counterReducer)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

const subscriberCounter = document.getElementById('subscriber-counter')!
const subscriberLog = document.getElementById('subscriber-log')!
const subscriberHistory = document.getElementById('subscriber-history')!

const stateHistory: CounterState[] = [store.getState() as CounterState]
let isFirstLog = true

store.subscribe((): void => {
  const state = store.getState() as CounterState
  subscriberCounter.textContent = String(state.value)
})

store.subscribe((): void => {
  if (isFirstLog) {
    subscriberLog.innerHTML = ''
    isFirstLog = false
  }
  const entry = document.createElement('div')
  entry.textContent = `→ ${lastActionType}`
  entry.style.padding = '2px 0'
  subscriberLog.appendChild(entry)
  subscriberLog.scrollTop = subscriberLog.scrollHeight
})

store.subscribe((): void => {
  const state = store.getState() as CounterState
  stateHistory.push(state)
  subscriberHistory.textContent = JSON.stringify(stateHistory, null, 2)
  subscriberHistory.scrollTop = subscriberHistory.scrollHeight
})

subscriberHistory.textContent = JSON.stringify(stateHistory, null, 2)

consolePanel.info('3 подписчика зарегистрированы: Counter Display, Action Log, History')

function dispatchAction(action: CounterAction): void {
  store.dispatch(action)
  consolePanel.log(`dispatch({ type: '${action.type}'${(action as AddAmountAction).payload !== undefined ? `, payload: ${(action as AddAmountAction).payload}` : ''} }) → 3 подписчика уведомлены`)
}

document.getElementById('btn-increment')!.addEventListener('click', (): void => {
  dispatchAction({ type: 'counter/incremented' })
})

document.getElementById('btn-decrement')!.addEventListener('click', (): void => {
  dispatchAction({ type: 'counter/decremented' })
})

document.getElementById('btn-add-five')!.addEventListener('click', (): void => {
  dispatchAction({ type: 'counter/addAmount', payload: 5 })
})

document.getElementById('btn-reset')!.addEventListener('click', (): void => {
  dispatchAction({ type: 'counter/reset' })
})
