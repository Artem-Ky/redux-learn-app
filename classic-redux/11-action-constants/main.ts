import { legacy_createStore as createStore } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'

const INCREMENTED = 'counter/incremented' as const
const DECREMENTED = 'counter/decremented' as const
const RESET = 'counter/reset' as const

interface CounterState {
  value: number
}

interface CounterAction {
  type: string
}

const initialState: CounterState = { value: 0 }

function counterReducer(
  state: CounterState = initialState,
  action: CounterAction
): CounterState {
  switch (action.type) {
    case INCREMENTED:
      return { ...state, value: state.value + 1 }
    case DECREMENTED:
      return { ...state, value: state.value - 1 }
    case RESET:
      return { value: 0 }
    default:
      return state
  }
}

const store = createStore(counterReducer)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const stateDisplayEl = document.getElementById('state-display')!
const counterBeforeEl = document.getElementById('counter-before')!
const counterAfterEl = document.getElementById('counter-after')!
const typoResultEl = document.getElementById('typo-result')!

function render(): void {
  const state = store.getState()
  stateDisplayEl.textContent = JSON.stringify(state, null, 2)
  counterBeforeEl.textContent = String(state.value)
  counterAfterEl.textContent = String(state.value)
}

store.subscribe(render)
render()

document.getElementById('btn-inc-before')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'counter/incremented' })
})

document.getElementById('btn-dec-before')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'counter/decremented' })
})

document.getElementById('btn-reset-before')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'counter/reset' })
})

document.getElementById('btn-typo')!.addEventListener('click', (): void => {
  const stateBefore = store.getState()
  store.dispatch({ type: 'counter/incremeted' })
  const stateAfter = store.getState()

  const changed = stateBefore.value !== stateAfter.value
  typoResultEl.style.color = changed ? 'var(--success)' : 'var(--error)'
  typoResultEl.textContent = changed
    ? '✔ State изменился'
    : `✖ State НЕ изменился!\n\nDispatch: { type: 'counter/incremeted' }  ← опечатка\nReducer ожидает: '${INCREMENTED}'\nReducer вернул прежний state — тихий баг!`
})

document.getElementById('btn-inc-after')!.addEventListener('click', (): void => {
  store.dispatch({ type: INCREMENTED })
})

document.getElementById('btn-dec-after')!.addEventListener('click', (): void => {
  store.dispatch({ type: DECREMENTED })
})

document.getElementById('btn-reset-after')!.addEventListener('click', (): void => {
  store.dispatch({ type: RESET })
})
