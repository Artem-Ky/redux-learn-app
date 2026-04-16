import { legacy_createStore as createStore } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'
import { ConsolePanel } from '../shared/console-panel'

interface CounterState {
  value: number
  history: number[]
}

interface IncrementAction { type: 'counter/increment' }
interface DecrementAction { type: 'counter/decrement' }
interface AddAction { type: 'counter/add'; payload: number }
interface ResetAction { type: 'counter/reset' }

type CounterAction = IncrementAction | DecrementAction | AddAction | ResetAction | { type: string }

const initialState: CounterState = {
  value: 0,
  history: []
}

function counterReducer(state: CounterState = initialState, action: CounterAction): CounterState {
  switch (action.type) {
    case 'counter/increment':
      return { ...state, value: state.value + 1, history: [...state.history, state.value + 1] }
    case 'counter/decrement':
      return { ...state, value: state.value - 1, history: [...state.history, state.value - 1] }
    case 'counter/add': {
      const amount = (action as AddAction).payload
      return { ...state, value: state.value + amount, history: [...state.history, state.value + amount] }
    }
    case 'counter/reset':
      return { ...state, value: 0, history: [...state.history, 0] }
    default:
      return state
  }
}

const devToolsEnhancer: any = (window as any).__REDUX_DEVTOOLS_EXTENSION__?.() || ((f: any) => f)

const store = createStore(counterReducer, devToolsEnhancer)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

const counterValue = document.getElementById('counter-value')!
const stateDisplay = document.getElementById('state-display')!
const btnInc = document.getElementById('btn-inc')!
const btnDec = document.getElementById('btn-dec')!
const btnReset = document.getElementById('btn-reset')!
const btnAdd5 = document.getElementById('btn-add5')!
const btnAdd10 = document.getElementById('btn-add10')!
const btnRandom = document.getElementById('btn-random')!

function render(): void {
  const state = store.getState() as CounterState
  counterValue.textContent = String(state.value)
  stateDisplay.textContent = JSON.stringify(state, null, 2)
}

store.subscribe(render)
render()

consolePanel.info('🔧 Подключение Redux DevTools')
consolePanel.log('')

const hasExtension = !!(window as any).__REDUX_DEVTOOLS_EXTENSION__
if (hasExtension) {
  consolePanel.success('✅ Redux DevTools расширение обнаружено!')
  consolePanel.log('Откройте DevTools браузера (F12) → вкладка "Redux"')
  consolePanel.log('Вы увидите те же экшены, что и в панели ниже')
} else {
  consolePanel.warn('⚠ Redux DevTools расширение НЕ установлено')
  consolePanel.log('')
  consolePanel.info('Инструкция по установке:')
  consolePanel.log('1. Откройте Chrome Web Store')
  consolePanel.log('   https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd')
  consolePanel.log('2. Нажмите "Установить"')
  consolePanel.log('3. Перезагрузите эту страницу')
  consolePanel.log('')
  consolePanel.info('Или для Firefox:')
  consolePanel.log('   https://addons.mozilla.org/en-US/firefox/addon/reduxdevtools/')
}

consolePanel.log('')
consolePanel.info('Код подключения:')
consolePanel.log('const enhancer = window.__REDUX_DEVTOOLS_EXTENSION__?.() || (f => f)')
consolePanel.log('const store = createStore(reducer, enhancer)')
consolePanel.log('')
consolePanel.log('Встроенная панель ниже работает по тому же принципу — попробуйте!')

btnInc.addEventListener('click', (): void => {
  store.dispatch({ type: 'counter/increment' })
  consolePanel.log('→ dispatch({ type: "counter/increment" })')
})

btnDec.addEventListener('click', (): void => {
  store.dispatch({ type: 'counter/decrement' })
  consolePanel.log('→ dispatch({ type: "counter/decrement" })')
})

btnReset.addEventListener('click', (): void => {
  store.dispatch({ type: 'counter/reset' })
  consolePanel.log('→ dispatch({ type: "counter/reset" })')
})

btnAdd5.addEventListener('click', (): void => {
  store.dispatch({ type: 'counter/add', payload: 5 })
  consolePanel.log('→ dispatch({ type: "counter/add", payload: 5 })')
})

btnAdd10.addEventListener('click', (): void => {
  store.dispatch({ type: 'counter/add', payload: 10 })
  consolePanel.log('→ dispatch({ type: "counter/add", payload: 10 })')
})

btnRandom.addEventListener('click', (): void => {
  const value = Math.floor(Math.random() * 100) - 50
  store.dispatch({ type: 'counter/add', payload: value })
  consolePanel.log(`→ dispatch({ type: "counter/add", payload: ${value} })`)
})
