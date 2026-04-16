import { legacy_createStore as createStore, applyMiddleware } from 'redux'
import { ConsolePanel } from '../shared/console-panel'

interface AppState {
  count: number
}

type AppAction =
  | { type: 'counter/increment' }
  | { type: 'counter/hello' }
  | { type: 'counter/promise' }
  | { type: string }

const initialState: AppState = { count: 0 }

function reducer(state: AppState = initialState, action: AppAction): AppState {
  switch (action.type) {
    case 'counter/increment':
    case 'counter/hello':
    case 'counter/promise':
      return { ...state, count: state.count + 1 }
    default:
      return state
  }
}

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)
const resultDisplay = document.getElementById('result-display')!
const typeDisplay = document.getElementById('type-display')!

const alwaysReturnHello = (storeAPI: any) => (next: any) => (action: any): any => {
  if (action.type === 'counter/hello') {
    next(action)
    consolePanel.log('🟠 alwaysReturnHello: next() вызван, но возвращаю "Hello!"', 'color: #ce9178')
    return 'Hello!'
  }
  return next(action)
}

const returnPromise = (storeAPI: any) => (next: any) => (action: any): any => {
  if (action.type === 'counter/promise') {
    consolePanel.log('🟢 returnPromise: возвращаю Promise...', 'color: #6a9955')
    return new Promise<string>((resolve) => {
      setTimeout((): void => {
        next(action)
        consolePanel.log('🟢 returnPromise: Promise resolved → "async done!"', 'color: #6a9955')
        resolve('async done!')
      }, 1000)
    })
  }
  return next(action)
}

const store = createStore(
  reducer,
  applyMiddleware(alwaysReturnHello, returnPromise)
)

function showResult(value: any): void {
  resultDisplay.textContent = JSON.stringify(value, null, 2)
  typeDisplay.textContent = typeof value
}

consolePanel.info('Pipeline: applyMiddleware(alwaysReturnHello, returnPromise)')
consolePanel.info('Каждая кнопка демонстрирует разное возвращаемое значение dispatch()')

document.getElementById('btn-normal')!.addEventListener('click', (): void => {
  consolePanel.log('──── dispatch({ type: "counter/increment" }) ────')
  const result = store.dispatch({ type: 'counter/increment' })
  consolePanel.log('Результат dispatch(): ' + JSON.stringify(result))
  consolePanel.log('typeof: ' + typeof result)
  showResult(result)
  consolePanel.log('')
})

document.getElementById('btn-hello')!.addEventListener('click', (): void => {
  consolePanel.log('──── dispatch({ type: "counter/hello" }) ────')
  const result = store.dispatch({ type: 'counter/hello' })
  consolePanel.log('Результат dispatch(): ' + JSON.stringify(result))
  consolePanel.log('typeof: ' + typeof result)
  showResult(result)
  consolePanel.log('')
})

document.getElementById('btn-promise')!.addEventListener('click', (): void => {
  consolePanel.log('──── dispatch({ type: "counter/promise" }) ────')
  const result = store.dispatch({ type: 'counter/promise' }) as any
  consolePanel.log('Результат dispatch(): [Promise] (ждём...)')
  typeDisplay.textContent = 'object (Promise)'
  resultDisplay.textContent = 'Promise { <pending> }'
  resultDisplay.style.color = 'var(--accent-green)'

  ;(result as Promise<string>).then((resolved: string): void => {
    consolePanel.log('Resolved: ' + JSON.stringify(resolved))
    showResult(resolved)
    consolePanel.log('')
  })
})
