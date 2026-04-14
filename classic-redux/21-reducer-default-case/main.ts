import { legacy_createStore as createStore } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'

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
    default:
      return state
  }
}

const store = createStore(counterReducer)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

function render(): void {
  const state = store.getState()
  document.getElementById('counter-value')!.textContent = String(state.value)
  document.getElementById('state-display')!.textContent = JSON.stringify(state, null, 2)
}

function showAction(action: CounterAction, changed: boolean): void {
  document.getElementById('action-display')!.textContent = JSON.stringify(action, null, 2)
  const changeEl = document.getElementById('change-display')!
  if (changed) {
    changeEl.textContent = '✔ Да — state изменился (новая ссылка)'
    changeEl.style.color = 'var(--success)'
  } else {
    changeEl.textContent = '✖ Нет — state не изменился (та же ссылка)'
    changeEl.style.color = 'var(--error)'
  }
}

store.subscribe(render)
render()

document.getElementById('btn-inc')!.addEventListener('click', (): void => {
  const before = store.getState()
  const action: CounterAction = { type: 'counter/incremented' }
  store.dispatch(action)
  const after = store.getState()
  showAction(action, before !== after)
})

document.getElementById('btn-dec')!.addEventListener('click', (): void => {
  const before = store.getState()
  const action: CounterAction = { type: 'counter/decremented' }
  store.dispatch(action)
  const after = store.getState()
  showAction(action, before !== after)
})

document.getElementById('btn-known')!.addEventListener('click', (): void => {
  const before = store.getState()
  const action: CounterAction = { type: 'counter/incremented' }
  store.dispatch(action)
  const after = store.getState()
  showAction(action, before !== after)
})

document.getElementById('btn-unknown')!.addEventListener('click', (): void => {
  const before = store.getState()
  const action: CounterAction = { type: 'some/unknownAction' }
  store.dispatch(action)
  const after = store.getState()
  showAction(action, before !== after)
})

document.getElementById('btn-unknown2')!.addEventListener('click', (): void => {
  const before = store.getState()
  const action: CounterAction = { type: 'banana/peel' }
  store.dispatch(action)
  const after = store.getState()
  showAction(action, before !== after)
})
