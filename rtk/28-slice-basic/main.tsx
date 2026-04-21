import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface CounterState { value: number; history: string[] }

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0, history: [] } as CounterState,
  reducers: {
    increment: (state) => { state.value += 1; state.history.push('+') },
    decrement: (state) => { state.value -= 1; state.history.push('-') },
    addBy: (state, action: PayloadAction<number>) => {
      state.value += action.payload
      state.history.push(`+${action.payload}`)
    },
    reset: () => ({ value: 0, history: [] }),
  },
})

const { increment, decrement, addBy, reset } = counterSlice.actions

const store = configureStore({ reducer: { counter: counterSlice.reducer } })

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог counterSlice')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const anatomy = {
  'slice.name':                counterSlice.name,
  'slice.actions (keys)':      Object.keys(counterSlice.actions),
  'slice.actions.increment.type':   counterSlice.actions.increment.type,
  'slice.actions.decrement.type':   counterSlice.actions.decrement.type,
  'slice.actions.addBy.type':       counterSlice.actions.addBy.type,
  'typeof slice.reducer':      typeof counterSlice.reducer,
  'slice.caseReducers (keys)': Object.keys(counterSlice.caseReducers),
  'slice.getInitialState()':   counterSlice.getInitialState(),
  'slice.reducerPath':         counterSlice.reducerPath,
}

document.getElementById('slice-anatomy')!.textContent = JSON.stringify(anatomy, null, 2)

const stateOut = document.getElementById('state-out')!
function render(): void {
  stateOut.textContent = JSON.stringify(store.getState(), null, 2)
}
render()
store.subscribe(render)

const ACTS: Record<string, () => { type: string; payload?: unknown }> = {
  inc:   () => increment(),
  dec:   () => decrement(),
  add:   () => addBy(5),
  reset: () => reset(),
}

document.querySelectorAll<HTMLButtonElement>('[data-act]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const a = ACTS[btn.dataset.act!]()
    store.dispatch(a)
    con.action(a)
  })
})

con.log('createSlice сгенерировал actions, reducer, caseReducers и getInitialState.')
con.info(`Action types префиксуются именем slice'а: "counter/increment", "counter/addBy" и т.д.`)
con.success('В DevTools видно state.counter — потому что в configureStore ключ так назван.')
