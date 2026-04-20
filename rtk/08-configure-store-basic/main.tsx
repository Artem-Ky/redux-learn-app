import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment: (state) => { state.value += 1 },
    decrement: (state) => { state.value -= 1 },
    addBy: (state, action: PayloadAction<number>) => { state.value += action.payload },
    reset: (state) => { state.value = 0 },
  },
})

const store = configureStore({
  reducer: { counter: counterSlice.reducer },
})

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог counter')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const valueEl = document.getElementById('value')!
store.subscribe(() => {
  valueEl.textContent = String(store.getState().counter.value)
})

const { increment, decrement, addBy, reset } = counterSlice.actions

document.getElementById('inc')!.addEventListener('click', () => {
  const a = increment()
  store.dispatch(a)
  con.action(a)
})
document.getElementById('dec')!.addEventListener('click', () => {
  const a = decrement()
  store.dispatch(a)
  con.action(a)
})
document.getElementById('add5')!.addEventListener('click', () => {
  const a = addBy(5)
  store.dispatch(a)
  con.action(a)
})
document.getElementById('reset')!.addEventListener('click', () => {
  const a = reset()
  store.dispatch(a)
  con.action(a)
})

con.log('Store создан через configureStore({ reducer: { counter: counterSlice.reducer } }).')
con.info('DevTools подключён через dev.connectStore(store) — оборачивает store.dispatch.')
con.success('@@INIT уже в истории. Нажмите кнопку — увидите новый action.')
