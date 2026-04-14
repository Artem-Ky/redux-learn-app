import { legacy_createStore as createStore } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'

interface CounterState {
  value: number
  lastActionType: string
}

interface CounterAction {
  type: string
  payload?: number
}

const initialState: CounterState = { value: 0, lastActionType: '' }

function counterReducer(
  state: CounterState = initialState,
  action: CounterAction
): CounterState {
  switch (action.type) {
    case 'counter/incremented':
      return { ...state, value: state.value + 1, lastActionType: action.type }
    case 'counter/decremented':
      return { ...state, value: state.value - 1, lastActionType: action.type }
    case 'counter/reset':
      return { value: 0, lastActionType: action.type }
    default:
      if (action.type.includes('/')) {
        return { ...state, lastActionType: action.type }
      }
      return state
  }
}

const store = createStore(counterReducer)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const domainInput = document.getElementById('input-domain') as HTMLInputElement
const eventInput = document.getElementById('input-event') as HTMLInputElement
const generatedEl = document.getElementById('generated-type')!
const actionDisplayEl = document.getElementById('action-display')!
const stateDisplayEl = document.getElementById('state-display')!

function updatePreview(): void {
  const domain = domainInput.value.trim() || 'domain'
  const event = eventInput.value.trim() || 'eventName'
  generatedEl.textContent = `${domain}/${event}`
}

function render(): void {
  const state = store.getState()
  stateDisplayEl.textContent = JSON.stringify(state, null, 2)
}

store.subscribe(render)
render()

domainInput.addEventListener('input', updatePreview)
eventInput.addEventListener('input', updatePreview)

document.getElementById('btn-generate')!.addEventListener('click', (): void => {
  const domain = domainInput.value.trim() || 'domain'
  const event = eventInput.value.trim() || 'eventName'
  const actionType = `${domain}/${event}`

  const action: CounterAction = { type: actionType }
  actionDisplayEl.textContent = JSON.stringify(action, null, 2)
  store.dispatch(action)
})
