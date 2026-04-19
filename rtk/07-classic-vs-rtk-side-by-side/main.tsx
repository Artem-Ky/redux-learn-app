import { createStore, combineReducers, type Reducer } from 'redux'
import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог двух counters'
)

interface CounterState { value: number }

const INCREMENT = 'counter/INCREMENT'
const DECREMENT = 'counter/DECREMENT'
const ADD_BY = 'counter/ADD_BY'
const RESET = 'counter/RESET'

interface ClassicAction { type: string; payload?: number }

const incrementAC = (): ClassicAction => ({ type: INCREMENT })
const decrementAC = (): ClassicAction => ({ type: DECREMENT })
const addByAC = (n: number): ClassicAction => ({ type: ADD_BY, payload: n })
const resetAC = (): ClassicAction => ({ type: RESET })

const counterReducer: Reducer<CounterState, ClassicAction> = (
  state = { value: 0 },
  action
) => {
  switch (action.type) {
    case INCREMENT: return { ...state, value: state.value + 1 }
    case DECREMENT: return { ...state, value: state.value - 1 }
    case ADD_BY:    return { ...state, value: state.value + (action.payload ?? 0) }
    case RESET:     return { ...state, value: 0 }
    default:        return state
  }
}

const classicStore = createStore(combineReducers({ counter: counterReducer }))

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 } as CounterState,
  reducers: {
    increment: (state) => { state.value += 1 },
    decrement: (state) => { state.value -= 1 },
    addBy: (state, action: PayloadAction<number>) => { state.value += action.payload },
    reset: (state) => { state.value = 0 },
  },
})

const rtkStore = configureStore({
  reducer: { counter: counterSlice.reducer },
})

const classicValueEl = document.getElementById('classic-value')!
const rtkValueEl = document.getElementById('rtk-value')!

classicStore.subscribe(() => {
  const v = (classicStore.getState() as { counter: CounterState }).counter.value
  classicValueEl.textContent = String(v)
})
rtkStore.subscribe(() => {
  const v = rtkStore.getState().counter.value
  rtkValueEl.textContent = String(v)
})

document.getElementById('classic-inc')!.addEventListener('click', () => {
  classicStore.dispatch(incrementAC())
  con.action({ type: INCREMENT }, 'classic')
})
document.getElementById('classic-dec')!.addEventListener('click', () => {
  classicStore.dispatch(decrementAC())
  con.action({ type: DECREMENT }, 'classic')
})
document.getElementById('classic-add5')!.addEventListener('click', () => {
  classicStore.dispatch(addByAC(5))
  con.action({ type: ADD_BY, payload: 5 }, 'classic')
})
document.getElementById('classic-reset')!.addEventListener('click', () => {
  classicStore.dispatch(resetAC())
  con.action({ type: RESET }, 'classic')
})

const { increment, decrement, addBy, reset } = counterSlice.actions
document.getElementById('rtk-inc')!.addEventListener('click', () => {
  const a = increment()
  rtkStore.dispatch(a)
  con.action(a, 'rtk')
})
document.getElementById('rtk-dec')!.addEventListener('click', () => {
  const a = decrement()
  rtkStore.dispatch(a)
  con.action(a, 'rtk')
})
document.getElementById('rtk-add5')!.addEventListener('click', () => {
  const a = addBy(5)
  rtkStore.dispatch(a)
  con.action(a, 'rtk')
})
document.getElementById('rtk-reset')!.addEventListener('click', () => {
  const a = reset()
  rtkStore.dispatch(a)
  con.action(a, 'rtk')
})

const CLASSIC_SRC = `<span class="cm">// 1) action types</span>
<span class="kw">const</span> INCREMENT = <span class="str">'counter/INCREMENT'</span>
<span class="kw">const</span> DECREMENT = <span class="str">'counter/DECREMENT'</span>
<span class="kw">const</span> ADD_BY    = <span class="str">'counter/ADD_BY'</span>
<span class="kw">const</span> RESET     = <span class="str">'counter/RESET'</span>

<span class="cm">// 2) action creators</span>
<span class="kw">const</span> <span class="fn">increment</span> = () =&gt; ({ type: INCREMENT })
<span class="kw">const</span> <span class="fn">decrement</span> = () =&gt; ({ type: DECREMENT })
<span class="kw">const</span> <span class="fn">addBy</span>     = (n) =&gt; ({ type: ADD_BY, payload: n })
<span class="kw">const</span> <span class="fn">reset</span>     = () =&gt; ({ type: RESET })

<span class="cm">// 3) reducer (switch + spread copy)</span>
<span class="kw">function</span> <span class="fn">counterReducer</span>(state = { value: <span class="num">0</span> }, action) {
  <span class="kw">switch</span> (action.type) {
    <span class="kw">case</span> INCREMENT: <span class="kw">return</span> { ...state, value: state.value + <span class="num">1</span> }
    <span class="kw">case</span> DECREMENT: <span class="kw">return</span> { ...state, value: state.value - <span class="num">1</span> }
    <span class="kw">case</span> ADD_BY:    <span class="kw">return</span> { ...state, value: state.value + action.payload }
    <span class="kw">case</span> RESET:     <span class="kw">return</span> { ...state, value: <span class="num">0</span> }
    <span class="kw">default</span>:        <span class="kw">return</span> state
  }
}

<span class="cm">// 4) store</span>
<span class="kw">const</span> rootReducer = <span class="fn">combineReducers</span>({ counter: counterReducer })
<span class="kw">const</span> store = <span class="fn">createStore</span>(
  rootReducer,
  composeWithDevTools(<span class="fn">applyMiddleware</span>(thunk))
)

<span class="cm">// 5) подключение в React</span>
<span class="kw">function</span> <span class="fn">Counter</span>() {
  <span class="kw">const</span> value = <span class="fn">useSelector</span>(s =&gt; s.counter.value)
  <span class="kw">const</span> dispatch = <span class="fn">useDispatch</span>()
  <span class="kw">return</span> &lt;button onClick={() =&gt; dispatch(<span class="fn">increment</span>())}&gt;+1&lt;/button&gt;
}`

const RTK_SRC = `<span class="cm">// 1) slice (всё в одном)</span>
<span class="kw">const</span> counterSlice = <span class="fn">createSlice</span>({
  name: <span class="str">'counter'</span>,
  initialState: { value: <span class="num">0</span> },
  reducers: {
    <span class="fn">increment</span>: (state) =&gt; { state.value += <span class="num">1</span> },
    <span class="fn">decrement</span>: (state) =&gt; { state.value -= <span class="num">1</span> },
    <span class="fn">addBy</span>: (state, action) =&gt; { state.value += action.payload },
    <span class="fn">reset</span>: (state) =&gt; { state.value = <span class="num">0</span> },
  },
})

<span class="kw">export const</span> { increment, decrement, addBy, reset } = counterSlice.actions

<span class="cm">// 2) store (devtools и thunk — автоматически)</span>
<span class="kw">const</span> store = <span class="fn">configureStore</span>({
  reducer: { counter: counterSlice.reducer },
})

<span class="cm">// 3) подключение в React (одинаково с classic)</span>
<span class="kw">function</span> <span class="fn">Counter</span>() {
  <span class="kw">const</span> value = <span class="fn">useSelector</span>(s =&gt; s.counter.value)
  <span class="kw">const</span> dispatch = <span class="fn">useDispatch</span>()
  <span class="kw">return</span> &lt;button onClick={() =&gt; dispatch(<span class="fn">increment</span>())}&gt;+1&lt;/button&gt;
}`

document.getElementById('classic-src')!.innerHTML = CLASSIC_SRC
document.getElementById('rtk-src')!.innerHTML = RTK_SRC

con.log('Оба counter подключены к разным store. Кнопки работают независимо.')
con.info('Откройте Redux DevTools — увидите два store с разными именами actions.')
con.warn('classic dispatch отправляет { type: "counter/INCREMENT" }, rtk — { type: "counter/increment" }.')
