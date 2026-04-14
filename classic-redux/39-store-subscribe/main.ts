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

type CounterAction =
  | IncrementedAction
  | DecrementedAction
  | { type: string }

const initialState: CounterState = { value: 0 }

function counterReducer(state: CounterState = initialState, action: CounterAction): CounterState {
  switch (action.type) {
    case 'counter/incremented':
      return { ...state, value: state.value + 1 }
    case 'counter/decremented':
      return { ...state, value: state.value - 1 }
    default:
      return state
  }
}

const store = createStore(counterReducer)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

const counterDisplay = document.getElementById('counter-display')!
const subStatus = document.getElementById('sub-status')!
const stateDisplay = document.getElementById('state-display')!
const btnUnsubscribe = document.getElementById('btn-unsubscribe') as HTMLButtonElement
const btnResubscribe = document.getElementById('btn-resubscribe') as HTMLButtonElement

stateDisplay.textContent = JSON.stringify(store.getState(), null, 2)

function listener(): void {
  const state = store.getState() as CounterState
  counterDisplay.textContent = String(state.value)
  consolePanel.log(`subscribe callback → state: ${JSON.stringify(state)}`)
}

let unsubscribe: (() => void) | null = store.subscribe(listener)
consolePanel.info('subscribe(listener) — подписка зарегистрирована')

function updateSubUI(subscribed: boolean): void {
  if (subscribed) {
    subStatus.textContent = '● подписан'
    subStatus.style.color = 'var(--success)'
    btnUnsubscribe.disabled = false
    btnResubscribe.disabled = true
  } else {
    subStatus.textContent = '● отписан'
    subStatus.style.color = 'var(--accent-red)'
    btnUnsubscribe.disabled = true
    btnResubscribe.disabled = false
  }
}

document.getElementById('btn-increment')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'counter/incremented' })
  stateDisplay.textContent = JSON.stringify(store.getState(), null, 2)
})

document.getElementById('btn-decrement')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'counter/decremented' })
  stateDisplay.textContent = JSON.stringify(store.getState(), null, 2)
})

btnUnsubscribe.addEventListener('click', (): void => {
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
    updateSubUI(false)
    consolePanel.warn('unsubscribe() — listener отписан. Dispatch всё ещё работает, но отображение не обновится.')
  }
})

btnResubscribe.addEventListener('click', (): void => {
  if (!unsubscribe) {
    unsubscribe = store.subscribe(listener)
    updateSubUI(true)
    consolePanel.success('subscribe(listener) — listener подписан заново')
    listener()
  }
})

document.getElementById('btn-check-state')!.addEventListener('click', (): void => {
  const state = store.getState() as CounterState
  stateDisplay.textContent = JSON.stringify(state, null, 2)
  consolePanel.info(`Ручная проверка getState(): ${JSON.stringify(state)}`)
})
