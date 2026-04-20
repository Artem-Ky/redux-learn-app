import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

const LS_KEY = 'rtk-lesson18-counter'

interface CounterState { value: number }

const slice = createSlice({
  name: 'counter',
  initialState: { value: 0 } as CounterState,
  reducers: {
    incremented: (s) => { s.value += 1 },
    decremented: (s) => { s.value -= 1 },
    addBy: (s, a: PayloadAction<number>) => { s.value += a.payload },
  },
})

function loadState(): { counter: CounterState } | undefined {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as { counter?: CounterState }
    if (parsed && typeof parsed.counter?.value === 'number') return parsed as { counter: CounterState }
    return undefined
  } catch {
    return undefined
  }
}

const preloaded = loadState()

const store = configureStore({
  reducer: { counter: slice.reducer },
  preloadedState: preloaded,
})

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог preloadedState')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const valueEl = document.getElementById('value')!
const lsEl = document.getElementById('ls-display')!

function refresh(): void {
  const v = store.getState().counter.value
  valueEl.textContent = String(v)
  const raw = localStorage.getItem(LS_KEY)
  if (raw) {
    lsEl.innerHTML = raw
  } else {
    lsEl.innerHTML = '<em>(пусто)</em>'
  }
}

store.subscribe(() => {
  const state = store.getState()
  localStorage.setItem(LS_KEY, JSON.stringify(state))
  refresh()
})

document.getElementById('inc')!.addEventListener('click', () => {
  const a = slice.actions.incremented()
  store.dispatch(a)
  con.action(a)
})
document.getElementById('dec')!.addEventListener('click', () => {
  const a = slice.actions.decremented()
  store.dispatch(a)
  con.action(a)
})
document.getElementById('add10')!.addEventListener('click', () => {
  const a = slice.actions.addBy(10)
  store.dispatch(a)
  con.action(a)
})

document.getElementById('clear-ls')!.addEventListener('click', () => {
  localStorage.removeItem(LS_KEY)
  refresh()
  con.warn('localStorage очищен. После F5 counter снова будет 0.')
})

refresh()

if (preloaded) {
  con.success(`✓ Restored from localStorage. preloadedState.counter.value = ${preloaded.counter.value}`)
  con.info('Откройте DevTools — первый @@INIT уже содержит ненулевое значение.')
} else {
  con.log('localStorage пуст. preloadedState = undefined → используется initialState slice (value: 0).')
  con.info('Кликните +1 несколько раз и нажмите F5 — увидите hydration в действии.')
}
