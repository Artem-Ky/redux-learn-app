import { legacy_createStore as createStore, AnyAction } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'
import { ConsolePanel } from '../shared/console-panel'

interface CounterState {
  value: number
}

interface IncrementAction { type: 'counter/increment'; payload: number }
interface ResetAction { type: 'counter/reset' }

type CounterAction = IncrementAction | ResetAction | { type: string }

const initialState: CounterState = { value: 0 }

function counterReducer(state: CounterState = initialState, action: CounterAction): CounterState {
  switch (action.type) {
    case 'counter/increment':
      return { value: state.value + (action as IncrementAction).payload }
    case 'counter/reset':
      return { value: 0 }
    default:
      return state
  }
}

const reduxDevToolsEnhancer =
  (window as any).__REDUX_DEVTOOLS_EXTENSION__?.({ trace: true, traceLimit: 25 }) ?? undefined

const store = createStore(counterReducer, reduxDevToolsEnhancer)

const traceMap = new Map<string, string>()

const originalDispatch = store.dispatch
store.dispatch = ((action: AnyAction): AnyAction => {
  const trace = new Error().stack || 'Stack trace unavailable'
  const key = `${action.type}_${Date.now()}`
  traceMap.set(key, trace)
  ;(action as AnyAction & { _traceKey: string })._traceKey = key
  return originalDispatch(action)
}) as any

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

const counterDisplay = document.getElementById('counter-display')!

const btnIncA = document.getElementById('btn-inc-a')!
const btnDecA = document.getElementById('btn-dec-a')!
const btnInc5B = document.getElementById('btn-inc5-b')!
const btnResetB = document.getElementById('btn-reset-b')!

function render(): void {
  const state = store.getState() as CounterState
  counterDisplay.textContent = String(state.value)
}

store.subscribe(render)
render()

function formatTrace(rawStack: string): string[] {
  const lines = rawStack.split('\n').filter(line => line.trim().startsWith('at '))
  return lines.slice(0, 8).map(line => line.trim())
}

function dispatchWithTrace(action: AnyAction, source: string): void {
  const result = store.dispatch(action)
  const traceKey = (result as AnyAction & { _traceKey?: string })._traceKey
    || (action as AnyAction & { _traceKey?: string })._traceKey
  const rawTrace = traceKey ? traceMap.get(traceKey) : undefined

  consolePanel.log('')
  consolePanel.info(`📍 dispatch("${action.type}") из: ${source}`)

  if (rawTrace) {
    consolePanel.log('  Stack trace:')
    const formatted = formatTrace(rawTrace)
    formatted.forEach(line => {
      consolePanel.log(`    ${line}`)
    })
  }
}

consolePanel.info('🔍 Trace — поиск источника dispatch')
consolePanel.log('')
consolePanel.log('Нажимайте кнопки из разных панелей.')
consolePanel.log('В консоли будет показан stack trace для каждого dispatch.')
consolePanel.log('')

function handlePanelAIncrement(): void {
  dispatchWithTrace({ type: 'counter/increment', payload: 1 }, 'Panel A — кнопка +1')
}

function handlePanelADecrement(): void {
  dispatchWithTrace({ type: 'counter/increment', payload: -1 }, 'Panel A — кнопка −1')
}

function handlePanelBIncrement5(): void {
  dispatchWithTrace({ type: 'counter/increment', payload: 5 }, 'Panel B — кнопка +5')
}

function handlePanelBReset(): void {
  dispatchWithTrace({ type: 'counter/reset' }, 'Panel B — кнопка Reset')
}

btnIncA.addEventListener('click', handlePanelAIncrement)
btnDecA.addEventListener('click', handlePanelADecrement)
btnInc5B.addEventListener('click', handlePanelBIncrement5)
btnResetB.addEventListener('click', handlePanelBReset)
