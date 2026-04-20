import React from 'react'
import ReactDOM from 'react-dom/client'
import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { Provider, useDispatch, useSelector } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface CounterState { value: number }

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 } as CounterState,
  reducers: {
    incremented: (s) => { s.value += 1 },
    decremented: (s) => { s.value -= 1 },
    addBy: (s, a: PayloadAction<number>) => { s.value += a.payload },
  },
})

const store = configureStore({
  reducer: { counter: counterSlice.reducer },
})

type RootState = ReturnType<typeof store.getState>
type AppDispatch = typeof store.dispatch

const useAppDispatch = useDispatch.withTypes<AppDispatch>()
const useAppSelector = useSelector.withTypes<RootState>()

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог типизированного store')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

function Counter(): React.ReactElement {
  const value = useAppSelector((s) => s.counter.value)
  const dispatch = useAppDispatch()

  React.useEffect(() => {
    con.info(`Counter render: value=${value}`)
  }, [value])

  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
      <div>
        <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          useAppSelector(s =&gt; s.counter.value)
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', color: 'var(--accent-cyan)' }}>{value}</div>
      </div>
      <button className="btn" onClick={() => {
        const a = counterSlice.actions.incremented()
        dispatch(a)
        con.action(a)
      }}>+1</button>
      <button className="btn" onClick={() => {
        const a = counterSlice.actions.decremented()
        dispatch(a)
        con.action(a)
      }}>−1</button>
      <button className="btn" onClick={() => {
        const a = counterSlice.actions.addBy(10)
        dispatch(a)
        con.action(a)
      }}>+10</button>
      <button className="btn" onClick={() => {
        dispatch(((dispatchInner, getState) => {
          const before = getState().counter.value
          con.info(`thunk видит RootState — текущее значение: ${before}`)
          setTimeout(() => {
            dispatchInner(counterSlice.actions.addBy(100))
            con.success('thunk: dispatch addBy(100) после 500ms')
          }, 500)
        }) as Parameters<AppDispatch>[0])
      }}>thunk +100 (через 500ms)</button>
    </div>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <Counter />
    </Provider>
  </React.StrictMode>
)

con.log('React-приложение замонтировано в #root.')
con.info('useAppDispatch.withTypes<AppDispatch>() — все dispatch типизированы (включая thunks).')
con.success('useAppSelector(s => s.counter.value) — TypeScript знает, что value: number.')
