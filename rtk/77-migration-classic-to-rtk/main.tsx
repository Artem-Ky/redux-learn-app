import {
  configureStore, createSlice, createAsyncThunk,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог миграции')

// ────────────────────────────────────────────────────────────────
// Финальный рабочий counter — результат всех 5 шагов
// ────────────────────────────────────────────────────────────────
const addAsync = createAsyncThunk<number, void>('counter/addAsync', async () => {
  await new Promise((r) => setTimeout(r, 500))
  return 10
})

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0, loading: false } as { value: number; loading: boolean },
  reducers: {
    increment: (s) => { s.value += 1 },
    decrement: (s) => { s.value -= 1 },
    reset: () => ({ value: 0, loading: false }),
  },
  extraReducers: (b) => {
    b.addCase(addAsync.pending, (s) => { s.loading = true })
    b.addCase(addAsync.fulfilled, (s, a: PayloadAction<number>) => {
      s.loading = false; s.value += a.payload
    })
    b.addCase(addAsync.rejected, (s) => { s.loading = false })
  },
})
const { increment, decrement, reset } = counterSlice.actions

const store = configureStore({ reducer: counterSlice.reducer })

const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const finalValue = document.getElementById('final-value')!
const finalStatus = document.getElementById('final-status')!
function renderFinal(): void {
  const s = store.getState()
  finalValue.textContent = String(s.value)
  finalStatus.textContent = s.loading ? 'loading…' : 'idle'
}
store.subscribe(renderFinal)
renderFinal()

document.getElementById('final-inc')!.addEventListener('click', () => {
  const a = increment(); store.dispatch(a); con.action(a)
})
document.getElementById('final-dec')!.addEventListener('click', () => {
  const a = decrement(); store.dispatch(a); con.action(a)
})
document.getElementById('final-reset')!.addEventListener('click', () => {
  const a = reset(); store.dispatch(a); con.action(a)
})
document.getElementById('final-async')!.addEventListener('click', () => {
  con.log('>>> dispatch(addAsync())')
  store.dispatch(addAsync())
})

// ────────────────────────────────────────────────────────────────
// Wizard: 5 шагов, для каждого — before / after код и описание
// ────────────────────────────────────────────────────────────────
interface Step {
  title: string
  desc: string
  before: string
  after: string
  beforeLines: number
  afterLines: number
}

const STEPS: Record<number, Step> = {
  1: {
    title: 'Step 1 — createAction вместо констант + creators',
    desc: 'Заменяем 1 константу и 1 action creator на 1 вызов createAction. ' +
          'Итоговый объект ведёт себя как функция (возвращает action) и имеет .type, .match, .toString().',
    before:
`<span class="cm">// constants</span>
<span class="kw">const</span> INCREMENT = <span class="str">'counter/INCREMENT'</span>
<span class="kw">const</span> DECREMENT = <span class="str">'counter/DECREMENT'</span>
<span class="kw">const</span> ADD_BY    = <span class="str">'counter/ADD_BY'</span>
<span class="kw">const</span> RESET     = <span class="str">'counter/RESET'</span>

<span class="cm">// action creators (руками)</span>
<span class="kw">const</span> <span class="fn">increment</span> = () =&gt; ({ type: INCREMENT })
<span class="kw">const</span> <span class="fn">decrement</span> = () =&gt; ({ type: DECREMENT })
<span class="kw">const</span> <span class="fn">addBy</span>     = (n) =&gt; ({ type: ADD_BY, payload: n })
<span class="kw">const</span> <span class="fn">reset</span>     = () =&gt; ({ type: RESET })

<span class="cm">// dispatch — как и раньше</span>
store.<span class="fn">dispatch</span>(<span class="fn">increment</span>())
store.<span class="fn">dispatch</span>(<span class="fn">addBy</span>(<span class="num">5</span>))`,
    after:
`<span class="kw">import</span> { createAction } <span class="kw">from</span> <span class="str">'@reduxjs/toolkit'</span>

<span class="cm">// 1 строка = 1 const + 1 creator</span>
<span class="kw">const</span> increment = <span class="fn">createAction</span>(<span class="str">'counter/increment'</span>)
<span class="kw">const</span> decrement = <span class="fn">createAction</span>(<span class="str">'counter/decrement'</span>)
<span class="kw">const</span> addBy     = <span class="fn">createAction</span>&lt;number&gt;(<span class="str">'counter/addBy'</span>)
<span class="kw">const</span> reset     = <span class="fn">createAction</span>(<span class="str">'counter/reset'</span>)

<span class="cm">// dispatch — точно так же</span>
store.<span class="fn">dispatch</span>(<span class="fn">increment</span>())
store.<span class="fn">dispatch</span>(<span class="fn">addBy</span>(<span class="num">5</span>))

<span class="cm">// Бонус: .type, .match, .toString() работают</span>
increment.type        <span class="cm">// 'counter/increment'</span>
increment.<span class="fn">match</span>(action) <span class="cm">// TypeGuard</span>`,
    beforeLines: 18,
    afterLines: 6,
  },

  2: {
    title: 'Step 2 — createReducer + Immer (switch исчезает)',
    desc: 'switch-reducer превращается в builder-callback. Immer включается автоматически — ' +
          'можно писать state.value++ вместо spread-копирования.',
    before:
`<span class="kw">function</span> <span class="fn">counterReducer</span>(state = { value: <span class="num">0</span> }, action) {
  <span class="kw">switch</span> (action.type) {
    <span class="kw">case</span> <span class="str">'counter/increment'</span>:
      <span class="kw">return</span> { ...state, value: state.value + <span class="num">1</span> }
    <span class="kw">case</span> <span class="str">'counter/decrement'</span>:
      <span class="kw">return</span> { ...state, value: state.value - <span class="num">1</span> }
    <span class="kw">case</span> <span class="str">'counter/addBy'</span>:
      <span class="kw">return</span> { ...state, value: state.value + action.payload }
    <span class="kw">case</span> <span class="str">'counter/reset'</span>:
      <span class="kw">return</span> { value: <span class="num">0</span> }
    <span class="kw">default</span>:
      <span class="kw">return</span> state
  }
}`,
    after:
`<span class="kw">import</span> { createReducer } <span class="kw">from</span> <span class="str">'@reduxjs/toolkit'</span>

<span class="kw">const</span> counterReducer = <span class="fn">createReducer</span>({ value: <span class="num">0</span> }, (builder) =&gt; {
  builder
    .<span class="fn">addCase</span>(increment, (s) =&gt; { s.value += <span class="num">1</span> })
    .<span class="fn">addCase</span>(decrement, (s) =&gt; { s.value -= <span class="num">1</span> })
    .<span class="fn">addCase</span>(addBy,     (s, a) =&gt; { s.value += a.payload })
    .<span class="fn">addCase</span>(reset,     ()      =&gt; ({ value: <span class="num">0</span> }))
})`,
    beforeLines: 14,
    afterLines: 7,
  },

  3: {
    title: 'Step 3 — createSlice объединяет actions + reducer',
    desc: 'Теперь action creators из шага 1 и reducer из шага 2 — в одном объекте. ' +
          'name служит префиксом для типов; reducers-ключи = имена action creators.',
    before:
`<span class="kw">const</span> increment = <span class="fn">createAction</span>(<span class="str">'counter/increment'</span>)
<span class="kw">const</span> decrement = <span class="fn">createAction</span>(<span class="str">'counter/decrement'</span>)
<span class="kw">const</span> addBy     = <span class="fn">createAction</span>&lt;number&gt;(<span class="str">'counter/addBy'</span>)
<span class="kw">const</span> reset     = <span class="fn">createAction</span>(<span class="str">'counter/reset'</span>)

<span class="kw">const</span> counterReducer = <span class="fn">createReducer</span>({ value: <span class="num">0</span> }, (b) =&gt; {
  b.<span class="fn">addCase</span>(increment, (s) =&gt; { s.value += <span class="num">1</span> })
  b.<span class="fn">addCase</span>(decrement, (s) =&gt; { s.value -= <span class="num">1</span> })
  b.<span class="fn">addCase</span>(addBy,     (s, a) =&gt; { s.value += a.payload })
  b.<span class="fn">addCase</span>(reset,     ()      =&gt; ({ value: <span class="num">0</span> }))
})`,
    after:
`<span class="kw">import</span> { createSlice } <span class="kw">from</span> <span class="str">'@reduxjs/toolkit'</span>

<span class="kw">const</span> counterSlice = <span class="fn">createSlice</span>({
  name: <span class="str">'counter'</span>,
  initialState: { value: <span class="num">0</span> },
  reducers: {
    <span class="fn">increment</span>: (s) =&gt; { s.value += <span class="num">1</span> },
    <span class="fn">decrement</span>: (s) =&gt; { s.value -= <span class="num">1</span> },
    <span class="fn">addBy</span>:     (s, a) =&gt; { s.value += a.payload },
    <span class="fn">reset</span>:     ()      =&gt; ({ value: <span class="num">0</span> }),
  },
})

<span class="kw">export const</span> { increment, decrement, addBy, reset } = counterSlice.actions
<span class="kw">export default</span> counterSlice.reducer`,
    beforeLines: 13,
    afterLines: 10,
  },

  4: {
    title: 'Step 4 — configureStore (всё внутри)',
    desc: 'createStore + applyMiddleware + composeWithDevTools → одна строка configureStore. ' +
          'Thunk включается автоматически; DevTools — тоже.',
    before:
`<span class="kw">import</span> { createStore, applyMiddleware, combineReducers } <span class="kw">from</span> <span class="str">'redux'</span>
<span class="kw">import</span> thunk <span class="kw">from</span> <span class="str">'redux-thunk'</span>
<span class="kw">import</span> { composeWithDevTools } <span class="kw">from</span> <span class="str">'redux-devtools-extension'</span>

<span class="kw">const</span> rootReducer = <span class="fn">combineReducers</span>({
  counter: counterReducer,
})

<span class="kw">const</span> store = <span class="fn">createStore</span>(
  rootReducer,
  <span class="fn">composeWithDevTools</span>(<span class="fn">applyMiddleware</span>(thunk)),
)`,
    after:
`<span class="kw">import</span> { configureStore } <span class="kw">from</span> <span class="str">'@reduxjs/toolkit'</span>

<span class="cm">// thunk + DevTools + immutable/serializable checks — всё включено</span>
<span class="kw">const</span> store = <span class="fn">configureStore</span>({
  reducer: { counter: counterSlice.reducer },
})`,
    beforeLines: 6,
    afterLines: 3,
  },

  5: {
    title: 'Step 5 — createAsyncThunk вместо ручного thunk',
    desc: 'Pending/fulfilled/rejected action creators генерируются автоматически. ' +
          'AbortController (thunkAPI.signal), rejectWithValue, condition — всё из коробки.',
    before:
`<span class="cm">// 1) три action types</span>
<span class="kw">const</span> FETCH_START   = <span class="str">'user/FETCH_START'</span>
<span class="kw">const</span> FETCH_SUCCESS = <span class="str">'user/FETCH_SUCCESS'</span>
<span class="kw">const</span> FETCH_FAIL    = <span class="str">'user/FETCH_FAIL'</span>

<span class="cm">// 2) три action creators</span>
<span class="kw">const</span> <span class="fn">start</span>   = ()        =&gt; ({ type: FETCH_START })
<span class="kw">const</span> <span class="fn">success</span> = (u)       =&gt; ({ type: FETCH_SUCCESS, payload: u })
<span class="kw">const</span> <span class="fn">fail</span>    = (err)     =&gt; ({ type: FETCH_FAIL, error: err })

<span class="cm">// 3) ручной thunk</span>
<span class="kw">const</span> <span class="fn">fetchUser</span> = (id) =&gt; <span class="kw">async</span> (dispatch) =&gt; {
  <span class="fn">dispatch</span>(<span class="fn">start</span>())
  <span class="kw">try</span> {
    <span class="kw">const</span> res = <span class="kw">await</span> <span class="fn">fetch</span>(<span class="str">\`/api/users/\${id}\`</span>)
    <span class="kw">const</span> user = <span class="kw">await</span> res.<span class="fn">json</span>()
    <span class="fn">dispatch</span>(<span class="fn">success</span>(user))
  } <span class="kw">catch</span> (err) {
    <span class="fn">dispatch</span>(<span class="fn">fail</span>(err.message))
  }
}

<span class="cm">// 4) три case в reducer</span>
<span class="kw">case</span> FETCH_START:   <span class="kw">return</span> { ...state, loading: <span class="kw">true</span>, error: <span class="kw">null</span> }
<span class="kw">case</span> FETCH_SUCCESS: <span class="kw">return</span> { ...state, loading: <span class="kw">false</span>, user: action.payload }
<span class="kw">case</span> FETCH_FAIL:    <span class="kw">return</span> { ...state, loading: <span class="kw">false</span>, error: action.error }`,
    after:
`<span class="kw">import</span> { createAsyncThunk, createSlice } <span class="kw">from</span> <span class="str">'@reduxjs/toolkit'</span>

<span class="kw">const</span> fetchUser = <span class="fn">createAsyncThunk</span>(
  <span class="str">'user/fetch'</span>,
  <span class="kw">async</span> (id, { signal }) =&gt; {
    <span class="kw">const</span> res = <span class="kw">await</span> <span class="fn">fetch</span>(<span class="str">\`/api/users/\${id}\`</span>, { signal })
    <span class="kw">return</span> res.<span class="fn">json</span>()
  },
)

<span class="cm">// extraReducers — builder callback</span>
extraReducers: (b) =&gt; {
  b.<span class="fn">addCase</span>(fetchUser.pending,   (s) =&gt; { s.loading = <span class="kw">true</span>;  s.error = <span class="kw">null</span> })
  b.<span class="fn">addCase</span>(fetchUser.fulfilled, (s, a) =&gt; { s.loading = <span class="kw">false</span>; s.user = a.payload })
  b.<span class="fn">addCase</span>(fetchUser.rejected,  (s, a) =&gt; { s.loading = <span class="kw">false</span>; s.error = a.error.message })
}`,
    beforeLines: 22,
    afterLines: 8,
  },
}

// ────────────────────────────────────────────────────────────────
// Wizard interactivity
// ────────────────────────────────────────────────────────────────
const beforeBody = document.getElementById('before-body')!
const afterBody = document.getElementById('after-body')!
const beforeLines = document.getElementById('before-lines')!
const afterLines = document.getElementById('after-lines')!
const stepInfo = document.getElementById('step-info')!

function showStep(n: number): void {
  const step = STEPS[n]
  if (!step) return
  beforeBody.innerHTML = step.before
  afterBody.innerHTML = step.after
  beforeLines.textContent = `${step.beforeLines} строк`
  afterLines.textContent = `${step.afterLines} строк`
  stepInfo.innerHTML = `<h3>${step.title}</h3><p>${step.desc}</p>`
  document.querySelectorAll<HTMLButtonElement>('.step-btn').forEach((b) => {
    b.classList.toggle('active', Number(b.dataset.step) === n)
  })
  con.log(`Step ${n}: ${step.title}`)
}

document.querySelectorAll<HTMLButtonElement>('.step-btn').forEach((btn) => {
  btn.addEventListener('click', () => showStep(Number(btn.dataset.step)))
})
showStep(1)

con.info('Кликайте Step 1 … Step 5 — увидите уменьшение кода.')
con.success('Миграция safe: делайте 1 PR на 1 шаг, от slice к slice.')
