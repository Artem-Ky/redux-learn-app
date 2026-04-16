import { legacy_createStore as createStore, applyMiddleware } from 'redux'
import { ConsolePanel } from '../shared/console-panel'

interface AppState {
  lastAction: string
  dispatchCount: number
}

interface AppAction {
  type: string
}

const initialState: AppState = { lastAction: 'none', dispatchCount: 0 }

function rootReducer(state: AppState = initialState, action: AppAction): AppState {
  switch (action.type) {
    case 'demo/dispatched':
      return { lastAction: action.type, dispatchCount: state.dispatchCount + 1 }
    default:
      return state
  }
}

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог прохождения через middleware')

const loggerMiddleware = (_storeAPI: any) => (next: any) => (action: any) => {
  con.log('  🟣 [Middleware 1 — Логирование] action: ' + JSON.stringify(action))
  return next(action)
}

const analyticsMiddleware = (_storeAPI: any) => (next: any) => (action: any) => {
  con.log('  🟠 [Middleware 2 — Аналитика] Записываем событие: ' + action.type)
  return next(action)
}

const timerMiddleware = (_storeAPI: any) => (next: any) => (action: any) => {
  const start = performance.now()
  const result = next(action)
  const duration = (performance.now() - start).toFixed(2)
  con.log('  🔵 [Middleware 3 — Таймер] Обработка заняла ' + duration + ' мс')
  return result
}

const store = createStore(
  rootReducer,
  applyMiddleware(loggerMiddleware, analyticsMiddleware, timerMiddleware)
)

const steps = ['step-action', 'step-mw1', 'step-mw2', 'step-mw3', 'step-reducer']
let animating = false

function clearHighlights(): void {
  steps.forEach(id => {
    document.getElementById(id)?.classList.remove('active')
  })
}

function highlightOnly(id: string): void {
  clearHighlights()
  document.getElementById(id)?.classList.add('active')
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function runDispatch(): Promise<void> {
  if (animating) return
  animating = true
  clearHighlights()

  const count = store.getState().dispatchCount + 1
  con.info(`─── Dispatch #${count} ───`)

  highlightOnly('step-action')
  con.log('📤 dispatch({ type: "demo/dispatched" })')
  await sleep(900)

  highlightOnly('step-mw1')
  con.log('  🟣 → Action входит в Middleware 1 (Логирование)...')
  await sleep(900)

  highlightOnly('step-mw2')
  con.log('  🟠 → Action проходит в Middleware 2 (Аналитика)...')
  await sleep(900)

  highlightOnly('step-mw3')
  con.log('  🔵 → Action проходит в Middleware 3 (Таймер)...')
  await sleep(900)

  highlightOnly('step-reducer')
  store.dispatch({ type: 'demo/dispatched' })
  con.success('  ✔ Reducer обработал action → новый state: ' + JSON.stringify(store.getState()))
  con.log('')

  await sleep(1000)
  clearHighlights()
  animating = false
}

function resetDemo(): void {
  clearHighlights()
  con.clear()
  con.info('Нажмите «Dispatch Action» чтобы увидеть путь action через middleware')
}

document.getElementById('btn-dispatch')!.addEventListener('click', runDispatch)
document.getElementById('btn-reset')!.addEventListener('click', resetDemo)

con.info('Action проходит: dispatch → Middleware 1 → Middleware 2 → Middleware 3 → Reducer')
con.log('Нажмите кнопку, чтобы увидеть это в действии')
