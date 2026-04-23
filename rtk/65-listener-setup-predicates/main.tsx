import {
  configureStore,
  createAction,
  createListenerMiddleware,
  createSlice,
  isAnyOf,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── slice ────────────────────────────────────────────────────────────
interface CounterState { value: number }
const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 } as CounterState,
  reducers: {
    increment: (s) => { s.value += 1 },
    decrement: (s) => { s.value -= 1 },
    incrementBy: (s, a: PayloadAction<number>) => { s.value += a.payload },
    reset: (s) => { s.value = 0 },
  },
})
const { increment, decrement, incrementBy, reset } = counterSlice.actions
// Unrelated action — не counter/*, для проверки что listener'ы его не ловят
const noiseAction = createAction<string>('noise/ping')

// ── listener middleware ──────────────────────────────────────────────
const listenerMiddleware = createListenerMiddleware()

// ── store (prepend!) ─────────────────────────────────────────────────
const store = configureStore({
  reducer: { counter: counterSlice.reducer },
  middleware: (getDefault) => getDefault().prepend(listenerMiddleware.middleware),
})
type RootState = ReturnType<typeof store.getState>

// ── panels ───────────────────────────────────────────────────────────
const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог 4 listener-форм')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

// ── счётчики срабатываний ────────────────────────────────────────────
const hits = { a: 0, b: 0, c: 0, d: 0 }
function bump(key: keyof typeof hits, label: string): void {
  hits[key] += 1
  const el = document.querySelector<HTMLElement>(`[data-count="${key}"]`)!
  el.textContent = String(hits[key])
  const card = document.querySelector<HTMLElement>(`[data-listener="${key}"]`)!
  card.classList.add('fired')
  setTimeout(() => card.classList.remove('fired'), 350)
  con.success(`[${key}] ${label}`)
}

// 1. actionCreator
listenerMiddleware.startListening({
  actionCreator: increment,
  effect: (action) => {
    bump('a', `actionCreator:increment — payload=${String(action.payload ?? 'undefined')}`)
  },
})

// 2. type: 'counter/decrement'
listenerMiddleware.startListening({
  type: 'counter/decrement',
  effect: (action) => {
    bump('b', `type:"counter/decrement" — type=${action.type}`)
  },
})

// 3. matcher: isAnyOf(increment, decrement)
listenerMiddleware.startListening({
  matcher: isAnyOf(increment, decrement),
  effect: (action) => {
    bump('c', `matcher:isAnyOf(inc,dec) — type=${action.type}`)
  },
})

// 4. predicate: пересекли границу value >= 10
listenerMiddleware.startListening({
  predicate: (_action, currentState, originalState) => {
    const cur = (currentState as RootState).counter.value
    const prev = (originalState as RootState).counter.value
    return cur >= 10 && prev < 10
  },
  effect: (_action, api) => {
    const s = api.getState() as RootState
    bump('d', `predicate: пересекли value=10 (${s.counter.value})`)
  },
})

// ── render ───────────────────────────────────────────────────────────
const countOut = document.getElementById('count-out')!
function render(): void {
  countOut.textContent = String(store.getState().counter.value)
}
render()
store.subscribe(render)

// ── buttons ──────────────────────────────────────────────────────────
document.getElementById('inc')!.addEventListener('click', () => {
  const a = increment(); store.dispatch(a); con.action(a)
})
document.getElementById('dec')!.addEventListener('click', () => {
  const a = decrement(); store.dispatch(a); con.action(a)
})
document.getElementById('inc-by-5')!.addEventListener('click', () => {
  const a = incrementBy(5); store.dispatch(a); con.action(a)
})
document.getElementById('noise')!.addEventListener('click', () => {
  const a = noiseAction('hello'); store.dispatch(a); con.action(a)
})
document.getElementById('reset')!.addEventListener('click', () => {
  const a = reset(); store.dispatch(a); con.action(a)
  hits.a = hits.b = hits.c = hits.d = 0
  ;(['a', 'b', 'c', 'd'] as const).forEach((k) => {
    document.querySelector<HTMLElement>(`[data-count="${k}"]`)!.textContent = '0'
  })
})

con.log('increment: сработают (a) actionCreator и (c) matcher.')
con.log('decrement: сработают (b) type и (c) matcher.')
con.log('incrementBy(5): сработает только (d) — и только когда счётчик пересечёт границу 10 впервые.')
con.warn('noise/ping — не знаком ни одной форме, не сработает ни один listener.')
