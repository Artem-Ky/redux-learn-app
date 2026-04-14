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

// ═══ Обычные (function declaration) ═══
function incrementRegular(): CounterAction {
  return { type: 'counter/incremented' }
}

function decrementRegular(): CounterAction {
  return { type: 'counter/decremented' }
}

function addAmountRegular(amount: number): CounterAction {
  return { type: 'counter/addAmount', payload: amount }
}

function resetRegular(): CounterAction {
  return { type: 'counter/reset' }
}

// ═══ Стрелочные (arrow function) ═══
const incrementArrow = (): CounterAction => ({
  type: 'counter/incremented'
})

const decrementArrow = (): CounterAction => ({
  type: 'counter/decremented'
})

const addAmountArrow = (amount: number): CounterAction => ({
  type: 'counter/addAmount',
  payload: amount
})

const resetArrow = (): CounterAction => ({
  type: 'counter/reset'
})

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
    case 'counter/reset':
      return { value: 0 }
    default:
      return state
  }
}

const store = createStore(counterReducer)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

let useArrow = false

const REGULAR_CODE = `// Обычная функция (function declaration)
function increment() {
  return { type: 'counter/incremented' }
}

function addAmount(amount) {
  return {
    type: 'counter/addAmount',
    payload: amount
  }
}`

const ARROW_CODE = `// Стрелочная функция (arrow function)
const increment = () => ({
  type: 'counter/incremented'
})

const addAmount = (amount) => ({
  type: 'counter/addAmount',
  payload: amount
})`

function render(): void {
  const state = store.getState()
  document.getElementById('counter-value')!.textContent = String(state.value)
  document.getElementById('state-display')!.textContent = JSON.stringify(state, null, 2)
}

function showAction(action: CounterAction): void {
  document.getElementById('action-display')!.textContent = JSON.stringify(action, null, 2)
}

function showCode(): void {
  document.getElementById('code-display')!.textContent = useArrow ? ARROW_CODE : REGULAR_CODE
}

store.subscribe(render)
render()
showCode()

document.getElementById('btn-inc')!.addEventListener('click', (): void => {
  const action = useArrow ? incrementArrow() : incrementRegular()
  showAction(action)
  store.dispatch(action)
})

document.getElementById('btn-dec')!.addEventListener('click', (): void => {
  const action = useArrow ? decrementArrow() : decrementRegular()
  showAction(action)
  store.dispatch(action)
})

document.getElementById('btn-add5')!.addEventListener('click', (): void => {
  const action = useArrow ? addAmountArrow(5) : addAmountRegular(5)
  showAction(action)
  store.dispatch(action)
})

document.getElementById('btn-reset')!.addEventListener('click', (): void => {
  const action = useArrow ? resetArrow() : resetRegular()
  showAction(action)
  store.dispatch(action)
})

document.getElementById('btn-show-regular')!.addEventListener('click', (): void => {
  useArrow = false
  showCode()
  document.getElementById('btn-show-regular')!.classList.add('btn--accent')
  document.getElementById('btn-show-arrow')!.classList.remove('btn--accent')
})

document.getElementById('btn-show-arrow')!.addEventListener('click', (): void => {
  useArrow = true
  showCode()
  document.getElementById('btn-show-arrow')!.classList.add('btn--accent')
  document.getElementById('btn-show-regular')!.classList.remove('btn--accent')
})
