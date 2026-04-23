import { createStore, combineReducers, type Reducer } from 'redux'
import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог трёх counters')

// ────────────────────────────────────────────────────────────────
// 1) CLASSIC REDUX
// ────────────────────────────────────────────────────────────────
interface ClassicState { value: number }
const INCREMENT = 'counter/INCREMENT'
const DECREMENT = 'counter/DECREMENT'
const RESET = 'counter/RESET'

interface ClassicAction { type: string }
const incAC = (): ClassicAction => ({ type: INCREMENT })
const decAC = (): ClassicAction => ({ type: DECREMENT })
const resetAC = (): ClassicAction => ({ type: RESET })

const classicReducer: Reducer<ClassicState, ClassicAction> = (state = { value: 0 }, action) => {
  switch (action.type) {
    case INCREMENT: return { ...state, value: state.value + 1 }
    case DECREMENT: return { ...state, value: state.value - 1 }
    case RESET:     return { ...state, value: 0 }
    default:        return state
  }
}

const classicStore = createStore(combineReducers({ counter: classicReducer }))

// ────────────────────────────────────────────────────────────────
// 2) REDUX TOOLKIT
// ────────────────────────────────────────────────────────────────
interface RtkState { value: number }
const rtkSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 } as RtkState,
  reducers: {
    increment: (s) => { s.value += 1 },
    decrement: (s) => { s.value -= 1 },
    reset: () => ({ value: 0 }),
  },
})
const { increment, decrement, reset } = rtkSlice.actions
const rtkStore = configureStore({ reducer: { counter: rtkSlice.reducer } })

// ────────────────────────────────────────────────────────────────
// 3) RTK QUERY
// Mock API через fetchFn — никаких реальных запросов, 300 мс задержка.
// Храним «серверное» состояние в замыкании serverValue; mutation изменяет его и возвращает новое.
// ────────────────────────────────────────────────────────────────
let serverValue = 0
type MutationOp = 'inc' | 'dec' | 'reset'

async function mockFetch(_input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  await new Promise((r) => setTimeout(r, 300))
  const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {}
  const op = body.op as MutationOp
  if (op === 'inc') serverValue += 1
  else if (op === 'dec') serverValue -= 1
  else if (op === 'reset') serverValue = 0
  return new Response(JSON.stringify({ value: serverValue }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

interface CounterDto { value: number }

const counterApi = createApi({
  reducerPath: 'counterApi',
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://mock.local',
    fetchFn: mockFetch as typeof fetch,
  }),
  endpoints: (build) => ({
    applyOp: build.mutation<CounterDto, MutationOp>({
      query: (op) => ({ url: '/counter', method: 'POST', body: { op } }),
    }),
  }),
})

const rtkqStore = configureStore({
  reducer: { [counterApi.reducerPath]: counterApi.reducer },
  middleware: (g) => g().concat(counterApi.middleware),
})

// ────────────────────────────────────────────────────────────────
// DevTools (к RTK store — ключевой для секции)
// ────────────────────────────────────────────────────────────────
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(rtkStore)

// ────────────────────────────────────────────────────────────────
// Рендер
// ────────────────────────────────────────────────────────────────
const classicValueEl = document.getElementById('classic-value')!
const rtkValueEl = document.getElementById('rtk-value')!
const rtkqValueEl = document.getElementById('rtkq-value')!
const rtkqStatusEl = document.getElementById('rtkq-status')!

classicStore.subscribe(() => {
  const v = (classicStore.getState() as { counter: ClassicState }).counter.value
  classicValueEl.textContent = String(v)
})
rtkStore.subscribe(() => {
  rtkValueEl.textContent = String(rtkStore.getState().counter.value)
})

// Подписка RTK Query — тащим последний fulfilled payload из cache
let lastMutationValue = 0
rtkqStore.subscribe(() => {
  const state = rtkqStore.getState()
  const apiState = state[counterApi.reducerPath]
  const mutations = apiState.mutations
  // ищем самый свежий fulfilled
  let latest: { value: number; status: string } | null = null
  let latestTs = 0
  for (const key in mutations) {
    const entry = mutations[key]
    if (!entry) continue
    const ts = (entry.startedTimeStamp ?? 0)
    if (ts >= latestTs) {
      latestTs = ts
      const data = (entry as { data?: CounterDto }).data
      latest = { value: data?.value ?? lastMutationValue, status: entry.status }
    }
  }
  if (latest) {
    if (latest.status === 'fulfilled') lastMutationValue = latest.value
    rtkqValueEl.textContent = String(lastMutationValue)
    rtkqStatusEl.textContent = latest.status
    rtkqStatusEl.className = 'counter-display__status'
    if (latest.status === 'pending') rtkqStatusEl.classList.add('pending')
    if (latest.status === 'rejected') rtkqStatusEl.classList.add('error')
  }
})

// ────────────────────────────────────────────────────────────────
// Кнопки
// ────────────────────────────────────────────────────────────────
document.getElementById('classic-inc')!.addEventListener('click', () => {
  const a = incAC(); classicStore.dispatch(a); con.action(a, 'classic')
})
document.getElementById('classic-dec')!.addEventListener('click', () => {
  const a = decAC(); classicStore.dispatch(a); con.action(a, 'classic')
})
document.getElementById('classic-reset')!.addEventListener('click', () => {
  const a = resetAC(); classicStore.dispatch(a); con.action(a, 'classic')
})

document.getElementById('rtk-inc')!.addEventListener('click', () => {
  const a = increment(); rtkStore.dispatch(a); con.action(a, 'rtk')
})
document.getElementById('rtk-dec')!.addEventListener('click', () => {
  const a = decrement(); rtkStore.dispatch(a); con.action(a, 'rtk')
})
document.getElementById('rtk-reset')!.addEventListener('click', () => {
  const a = reset(); rtkStore.dispatch(a); con.action(a, 'rtk')
})

function triggerMutation(op: MutationOp): void {
  con.log(`[rtkq] dispatch(counterApi.endpoints.applyOp.initiate('${op}'))`)
  const promise = rtkqStore.dispatch(counterApi.endpoints.applyOp.initiate(op))
  promise.then((res) => {
    if ('data' in res && res.data) {
      con.success(`[rtkq] fulfilled — value=${res.data.value}`)
    } else if ('error' in res) {
      con.error(`[rtkq] rejected — ${JSON.stringify(res.error)}`)
    }
    // важно — освобождаем mutation subscription
    promise.reset()
  })
}
document.getElementById('rtkq-inc')!.addEventListener('click', () => triggerMutation('inc'))
document.getElementById('rtkq-dec')!.addEventListener('click', () => triggerMutation('dec'))
document.getElementById('rtkq-reset')!.addEventListener('click', () => triggerMutation('reset'))

// ────────────────────────────────────────────────────────────────
// Источники и счётчик строк (визуально, в уроке)
// ────────────────────────────────────────────────────────────────
const CLASSIC_SRC = `<span class="cm">// 1) action types</span>
<span class="kw">const</span> INCREMENT = <span class="str">'counter/INCREMENT'</span>
<span class="kw">const</span> DECREMENT = <span class="str">'counter/DECREMENT'</span>
<span class="kw">const</span> RESET     = <span class="str">'counter/RESET'</span>

<span class="cm">// 2) action creators</span>
<span class="kw">const</span> <span class="fn">inc</span>   = () =&gt; ({ type: INCREMENT })
<span class="kw">const</span> <span class="fn">dec</span>   = () =&gt; ({ type: DECREMENT })
<span class="kw">const</span> <span class="fn">reset</span> = () =&gt; ({ type: RESET })

<span class="cm">// 3) reducer (switch + spread)</span>
<span class="kw">function</span> <span class="fn">counterReducer</span>(state = { value: <span class="num">0</span> }, action) {
  <span class="kw">switch</span> (action.type) {
    <span class="kw">case</span> INCREMENT: <span class="kw">return</span> { ...state, value: state.value + <span class="num">1</span> }
    <span class="kw">case</span> DECREMENT: <span class="kw">return</span> { ...state, value: state.value - <span class="num">1</span> }
    <span class="kw">case</span> RESET:     <span class="kw">return</span> { ...state, value: <span class="num">0</span> }
    <span class="kw">default</span>:        <span class="kw">return</span> state
  }
}

<span class="cm">// 4) store</span>
<span class="kw">const</span> store = <span class="fn">createStore</span>(
  <span class="fn">combineReducers</span>({ counter: counterReducer }),
)`

const RTK_SRC = `<span class="cm">// slice — всё в одном</span>
<span class="kw">const</span> counterSlice = <span class="fn">createSlice</span>({
  name: <span class="str">'counter'</span>,
  initialState: { value: <span class="num">0</span> },
  reducers: {
    <span class="fn">increment</span>: (s) =&gt; { s.value += <span class="num">1</span> },
    <span class="fn">decrement</span>: (s) =&gt; { s.value -= <span class="num">1</span> },
    <span class="fn">reset</span>:     () =&gt; ({ value: <span class="num">0</span> }),
  },
})
<span class="kw">const</span> { increment, decrement, reset } = counterSlice.actions

<span class="kw">const</span> store = <span class="fn">configureStore</span>({
  reducer: { counter: counterSlice.reducer },
})`

const RTKQ_SRC = `<span class="cm">// createApi — генерит reducer + middleware + actions</span>
<span class="kw">const</span> counterApi = <span class="fn">createApi</span>({
  reducerPath: <span class="str">'counterApi'</span>,
  baseQuery: <span class="fn">fetchBaseQuery</span>({
    baseUrl: <span class="str">'https://mock.local'</span>,
    fetchFn: mockFetch, <span class="cm">// setTimeout + new Response()</span>
  }),
  endpoints: (build) =&gt; ({
    <span class="fn">applyOp</span>: build.mutation&lt;CounterDto, MutationOp&gt;({
      query: (op) =&gt; ({ url: <span class="str">'/counter'</span>, method: <span class="str">'POST'</span>, body: { op } }),
    }),
  }),
})

<span class="kw">const</span> store = <span class="fn">configureStore</span>({
  reducer: { [counterApi.reducerPath]: counterApi.reducer },
  middleware: (g) =&gt; <span class="fn">g</span>().concat(counterApi.middleware),
})

<span class="cm">// dispatch без React hooks</span>
store.<span class="fn">dispatch</span>(counterApi.endpoints.applyOp.<span class="fn">initiate</span>(<span class="str">'inc'</span>))`

function countLines(src: string): number {
  // убираем HTML-теги, считаем не-пустые строки кода
  const clean = src.replace(/<[^>]+>/g, '')
  return clean.split('\n').filter((l) => l.trim().length > 0).length
}

document.getElementById('classic-src')!.innerHTML = CLASSIC_SRC
document.getElementById('rtk-src')!.innerHTML = RTK_SRC
document.getElementById('rtkq-src')!.innerHTML = RTKQ_SRC
document.getElementById('classic-lines')!.textContent = `~${countLines(CLASSIC_SRC)} строк`
document.getElementById('rtk-lines')!.textContent = `~${countLines(RTK_SRC)} строк`
document.getElementById('rtkq-lines')!.textContent = `~${countLines(RTKQ_SRC)} строк`

con.log('Три counter-store работают параллельно.')
con.info('Classic и RTK — синхронные. RTK Query — асинхронный (300 мс mock).')
con.warn('RTK Query для counter — только демо. В бою его задача — server state (GET /api/...).')
