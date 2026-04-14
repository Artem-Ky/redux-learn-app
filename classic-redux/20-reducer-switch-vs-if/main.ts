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

function switchReducer(
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

function ifElseReducer(
  state: CounterState = initialState,
  action: CounterAction
): CounterState {
  if (action.type === 'counter/incremented') {
    return { ...state, value: state.value + 1 }
  } else if (action.type === 'counter/decremented') {
    return { ...state, value: state.value - 1 }
  } else if (action.type === 'counter/addAmount') {
    return { ...state, value: state.value + (action.payload ?? 0) }
  } else if (action.type === 'counter/reset') {
    return { value: 0 }
  } else {
    return state
  }
}

type ReducerStyle = 'switch' | 'ifelse'
let activeStyle: ReducerStyle = 'switch'

function getActiveReducer(): (state: CounterState | undefined, action: CounterAction) => CounterState {
  return activeStyle === 'switch' ? switchReducer : ifElseReducer
}

let store = createStore(getActiveReducer())

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const switchCode = `<span class="kw">function</span> <span class="fn">counterReducer</span>(state, action) {
  <span class="kw">switch</span> (action.<span class="prop">type</span>) {
    <span class="kw">case</span> <span class="str">'counter/incremented'</span>:
      <span class="kw">return</span> { ...state, <span class="prop">value</span>: state.<span class="prop">value</span> + <span class="num">1</span> }
    <span class="kw">case</span> <span class="str">'counter/decremented'</span>:
      <span class="kw">return</span> { ...state, <span class="prop">value</span>: state.<span class="prop">value</span> - <span class="num">1</span> }
    <span class="kw">case</span> <span class="str">'counter/addAmount'</span>:
      <span class="kw">return</span> { ...state, <span class="prop">value</span>: state.<span class="prop">value</span> + action.<span class="prop">payload</span> }
    <span class="kw">case</span> <span class="str">'counter/reset'</span>:
      <span class="kw">return</span> { <span class="prop">value</span>: <span class="num">0</span> }
    <span class="kw">default</span>:
      <span class="kw">return</span> state
  }
}`

const ifElseCode = `<span class="kw">function</span> <span class="fn">counterReducer</span>(state, action) {
  <span class="kw">if</span> (action.<span class="prop">type</span> === <span class="str">'counter/incremented'</span>) {
    <span class="kw">return</span> { ...state, <span class="prop">value</span>: state.<span class="prop">value</span> + <span class="num">1</span> }
  } <span class="kw">else if</span> (action.<span class="prop">type</span> === <span class="str">'counter/decremented'</span>) {
    <span class="kw">return</span> { ...state, <span class="prop">value</span>: state.<span class="prop">value</span> - <span class="num">1</span> }
  } <span class="kw">else if</span> (action.<span class="prop">type</span> === <span class="str">'counter/addAmount'</span>) {
    <span class="kw">return</span> { ...state, <span class="prop">value</span>: state.<span class="prop">value</span> + action.<span class="prop">payload</span> }
  } <span class="kw">else if</span> (action.<span class="prop">type</span> === <span class="str">'counter/reset'</span>) {
    <span class="kw">return</span> { <span class="prop">value</span>: <span class="num">0</span> }
  } <span class="kw">else</span> {
    <span class="kw">return</span> state
  }
}`

function updateCodeDisplay(): void {
  document.getElementById('code-display')!.innerHTML =
    activeStyle === 'switch' ? switchCode : ifElseCode
  document.getElementById('active-style')!.textContent =
    activeStyle === 'switch' ? 'switch/case' : 'if/else'
}

function render(): void {
  const state = store.getState()
  document.getElementById('counter-value')!.textContent = String(state.value)
  document.getElementById('state-display')!.textContent = JSON.stringify(state, null, 2)
}

store.subscribe(render)
render()
updateCodeDisplay()

document.getElementById('btn-toggle-style')!.addEventListener('click', (): void => {
  activeStyle = activeStyle === 'switch' ? 'ifelse' : 'switch'
  const currentState = store.getState()

  store = createStore(getActiveReducer(), currentState)
  devtools.clear()
  devtools.connectStore(store)
  store.subscribe(render)

  updateCodeDisplay()
  render()
})

document.getElementById('btn-inc')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'counter/incremented' })
})

document.getElementById('btn-dec')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'counter/decremented' })
})

document.getElementById('btn-reset')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'counter/reset' })
})

document.getElementById('btn-add5')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'counter/addAmount', payload: 5 })
})
