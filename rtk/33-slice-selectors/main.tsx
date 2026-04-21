import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface CounterState { value: number; history: string[] }

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0, history: [] } as CounterState,
  reducers: {
    increment: (s) => { s.value += 1; s.history.push('+') },
    decrement: (s) => { s.value -= 1; s.history.push('-') },
    addBy: (s, a: PayloadAction<number>) => { s.value += a.payload; s.history.push(`+${a.payload}`) },
    reset: () => ({ value: 0, history: [] }),
  },
  selectors: {
    selectValue: (state) => state.value,
    selectIsEven: (state) => state.value % 2 === 0,
    selectIsPositive: (state) => state.value > 0,
    selectHistoryLength: (state) => state.history.length,
    selectHistoryItem: (state, index: number) => state.history[index] ?? '(нет)',
  },
})

const { increment, decrement, addBy, reset } = counterSlice.actions
const { selectValue, selectIsEven, selectIsPositive, selectHistoryLength, selectHistoryItem } =
  counterSlice.selectors

const store = configureStore({ reducer: { counter: counterSlice.reducer } })

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог selectors')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const stateOut = document.getElementById('state-out')!
const selsOut = document.getElementById('selectors-out')!

function render(): void {
  const root = store.getState()
  stateOut.textContent = JSON.stringify(root, null, 2)

  const rows = [
    ['selectValue(root)',           selectValue(root)],
    ['selectIsEven(root)',          selectIsEven(root)],
    ['selectIsPositive(root)',      selectIsPositive(root)],
    ['selectHistoryLength(root)',   selectHistoryLength(root)],
    ['selectHistoryItem(root, 0)',  selectHistoryItem(root, 0)],
    ['selectHistoryItem(root, -1)', selectHistoryItem(root, root.counter.history.length - 1)],
    ['selectSlice(root)',           JSON.stringify(counterSlice.selectSlice(root))],
  ]
  selsOut.innerHTML = rows
    .map(
      ([k, v]) =>
        `<div class="sel-row"><span class="sel-row__k">${k}</span><span class="sel-row__v">${String(v)}</span></div>`
    )
    .join('')
}
render()
store.subscribe(render)

const ACTS: Record<string, () => { type: string; payload?: unknown }> = {
  inc:   () => increment(),
  dec:   () => decrement(),
  add5:  () => addBy(5),
  reset: () => reset(),
}

document.querySelectorAll<HTMLButtonElement>('[data-act]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const a = ACTS[btn.dataset.act!]()
    store.dispatch(a)
    con.action(a)
  })
})

con.log('selectors внутри createSlice получают state slice'+'а, но снаружи работают на root state.')
con.info('selectSlice — built-in селектор для всего state slice'+'а.')
con.success('Селекторы с аргументами: selectHistoryItem(root, index).')
