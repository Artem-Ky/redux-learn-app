import { configureStore, createSlice, type Middleware } from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

const slice = createSlice({
  name: 'demo',
  initialState: { value: 0 },
  reducers: { incremented: (s) => { s.value += 1 } },
})

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог Tuple-middleware')

const loggerMiddleware: Middleware = () => (next) => (action) => {
  con.info(`[logger] перехвачен action: ${JSON.stringify(action)}`)
  return next(action)
}

const store = configureStore({
  reducer: { demo: slice.reducer },
  middleware: (gdm) => gdm().concat(loggerMiddleware),
})

const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

document.getElementById('dispatch')!.addEventListener('click', () => {
  const a = slice.actions.incremented()
  store.dispatch(a)
  con.action(a)
})

con.log('Store создан с middleware: (gdm) => gdm().concat(loggerMiddleware).')
con.info('Tuple сохраняет TS-типы — store.dispatch остаётся типизированным с поддержкой thunk.')
con.success('Кликайте «dispatch» — logger перехватит action и запишет в console.')
