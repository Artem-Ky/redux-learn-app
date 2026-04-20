import { legacy_createStore as createStore, combineReducers, applyMiddleware, compose, type Reducer, type AnyAction } from 'redux'
import { thunk } from 'redux-thunk'
import { configureStore, createSlice } from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface CounterState { value: number }

const counterReducerLegacy: Reducer<CounterState, AnyAction> = (state = { value: 0 }, action) => {
  switch (action.type) {
    case 'counter/incremented': return { value: state.value + 1 }
    case 'counter/reset':       return { value: 0 }
    default: return state
  }
}

const composeEnhancers =
  (window as unknown as { __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: typeof compose }).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ ?? compose

const legacyStore = createStore(
  combineReducers({ counter: counterReducerLegacy }),
  composeEnhancers(applyMiddleware(thunk))
)

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 } as CounterState,
  reducers: {
    incremented: (s) => { s.value += 1 },
    reset: (s) => { s.value = 0 },
  },
})

const rtkStore = configureStore({
  reducer: { counter: counterSlice.reducer },
})

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог двух store')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(rtkStore)

const legacyValueEl = document.getElementById('legacy-value')!
const rtkValueEl = document.getElementById('rtk-value')!

legacyStore.subscribe(() => {
  legacyValueEl.textContent = String((legacyStore.getState() as { counter: CounterState }).counter.value)
})
rtkStore.subscribe(() => {
  rtkValueEl.textContent = String(rtkStore.getState().counter.value)
})

document.getElementById('legacy-inc')!.addEventListener('click', () => {
  legacyStore.dispatch({ type: 'counter/incremented' })
  con.action({ type: 'counter/incremented' }, 'legacy')
})
document.getElementById('legacy-reset')!.addEventListener('click', () => {
  legacyStore.dispatch({ type: 'counter/reset' })
  con.action({ type: 'counter/reset' }, 'legacy')
})

document.getElementById('rtk-inc')!.addEventListener('click', () => {
  const a = counterSlice.actions.incremented()
  rtkStore.dispatch(a)
  con.action(a, 'rtk')
})
document.getElementById('rtk-reset')!.addEventListener('click', () => {
  const a = counterSlice.actions.reset()
  rtkStore.dispatch(a)
  con.action(a, 'rtk')
})

const LEGACY_SRC = `<span class="cm">// 1) reducer вручную (switch)</span>
<span class="kw">function</span> <span class="fn">counterReducer</span>(state = { value: <span class="num">0</span> }, action) {
  <span class="kw">switch</span> (action.type) {
    <span class="kw">case</span> <span class="str">'counter/incremented'</span>: <span class="kw">return</span> { value: state.value + <span class="num">1</span> }
    <span class="kw">case</span> <span class="str">'counter/reset'</span>:       <span class="kw">return</span> { value: <span class="num">0</span> }
    <span class="kw">default</span>: <span class="kw">return</span> state
  }
}

<span class="cm">// 2) combineReducers вручную</span>
<span class="kw">const</span> rootReducer = <span class="fn">combineReducers</span>({ counter: counterReducer })

<span class="cm">// 3) применить middleware вручную</span>
<span class="kw">const</span> middlewareEnhancer = <span class="fn">applyMiddleware</span>(thunk)

<span class="cm">// 4) DevTools — через composeWithDevTools</span>
<span class="kw">const</span> composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose

<span class="cm">// 5) создать store</span>
<span class="kw">const</span> store = <span class="fn">createStore</span>(
  rootReducer,
  <span class="fn">composeEnhancers</span>(middlewareEnhancer)
)`

const RTK_SRC = `<span class="cm">// 1) reducer через slice (Immer + auto actions)</span>
<span class="kw">const</span> counterSlice = <span class="fn">createSlice</span>({
  name: <span class="str">'counter'</span>,
  initialState: { value: <span class="num">0</span> },
  reducers: {
    <span class="fn">incremented</span>: (s) =&gt; { s.value += <span class="num">1</span> },
    <span class="fn">reset</span>:       (s) =&gt; { s.value = <span class="num">0</span> },
  },
})

<span class="cm">// 2) configureStore делает остальное:</span>
<span class="cm">//    + combineReducers (если объект)</span>
<span class="cm">//    + thunk middleware</span>
<span class="cm">//    + immutable / serializable / action invariant middleware</span>
<span class="cm">//    + autoBatchEnhancer</span>
<span class="cm">//    + composeWithDevTools</span>
<span class="kw">const</span> store = <span class="fn">configureStore</span>({
  reducer: { counter: counterSlice.reducer },
})`

document.getElementById('src-legacy')!.innerHTML = LEGACY_SRC
document.getElementById('src-rtk')!.innerHTML = RTK_SRC

con.log('Два независимых store. Слева ванильный, справа RTK.')
con.info('DevTools подключён к RTK-store. Кликните +1 справа — увидите запись.')
con.warn('createStore отмечен как deprecated и переименован в legacy_createStore.')
