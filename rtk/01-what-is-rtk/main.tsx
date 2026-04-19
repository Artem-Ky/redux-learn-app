import { legacy_createStore as createStore, combineReducers } from 'redux'
import { configureStore, createSlice } from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог обоих counter'
)

// ─── 1. CLASSIC ───────────────────────────────────────────
const INC = 'counter/incremented'
const DEC = 'counter/decremented'
const incClassic = () => ({ type: INC })
const decClassic = () => ({ type: DEC })

interface ClassicState { value: number }
function classicReducer(state: ClassicState = { value: 0 }, action: { type: string }): ClassicState {
  switch (action.type) {
    case INC: return { ...state, value: state.value + 1 }
    case DEC: return { ...state, value: state.value - 1 }
    default: return state
  }
}
const classicStore = createStore(combineReducers({ counter: classicReducer }))

// ─── 2. RTK ──────────────────────────────────────────────
const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment: (state) => { state.value++ },
    decrement: (state) => { state.value-- },
  },
})
const rtkStore = configureStore({ reducer: { counter: counterSlice.reducer } })

// ─── 3. UI binding ───────────────────────────────────────
const cVal = document.getElementById('c-classic-val')!
const rVal = document.getElementById('c-rtk-val')!

classicStore.subscribe(() => {
  const v = (classicStore.getState() as { counter: ClassicState }).counter.value
  cVal.textContent = String(v)
})
rtkStore.subscribe(() => {
  const v = rtkStore.getState().counter.value
  rVal.textContent = String(v)
})

document.getElementById('c-classic-inc')!.addEventListener('click', () => {
  con.info('classic → dispatch({ type: "counter/incremented" })')
  classicStore.dispatch(incClassic())
})
document.getElementById('c-classic-dec')!.addEventListener('click', () => {
  con.info('classic → dispatch({ type: "counter/decremented" })')
  classicStore.dispatch(decClassic())
})
document.getElementById('c-rtk-inc')!.addEventListener('click', () => {
  con.success('rtk → dispatch(counterSlice.actions.increment())')
  rtkStore.dispatch(counterSlice.actions.increment())
})
document.getElementById('c-rtk-dec')!.addEventListener('click', () => {
  con.success('rtk → dispatch(counterSlice.actions.decrement())')
  rtkStore.dispatch(counterSlice.actions.decrement())
})

document.getElementById('btn-run')!.addEventListener('click', () => {
  con.log('─── Sequential test: 3 increments на каждом store ───')
  for (let i = 0; i < 3; i++) {
    classicStore.dispatch(incClassic())
    rtkStore.dispatch(counterSlice.actions.increment())
  }
  con.success(`Готово. classic=${(classicStore.getState() as { counter: ClassicState }).counter.value}, rtk=${rtkStore.getState().counter.value}`)
})

con.log('Оба counter подписаны на свои store. Кликайте + / − или "Запустить оба".')
con.info('Обратите внимание: action.type у обоих одинаковый — "counter/incremented" — RTK генерирует его из name + reducer key.')
