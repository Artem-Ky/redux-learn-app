import { legacy_createStore as createStore, applyMiddleware } from 'redux'
import { ConsolePanel } from '../shared/console-panel'

interface AppState {
  value: number
}

interface AppAction {
  type: string
}

const initialState: AppState = { value: 0 }

function rootReducer(state: AppState = initialState, action: AppAction): AppState {
  switch (action.type) {
    case 'increment':
      return { value: state.value + 1 }
    default:
      return state
  }
}

const con = new ConsolePanel(document.getElementById('console-container')!, 'Сравнение синтаксисов middleware')

const functionStyleCode = `function myMiddleware(storeAPI) {
  return function wrapDispatch(next) {
    return function handleAction(action) {
      console.log('[function] action:', action.type)
      return next(action)
    }
  }
}`

const arrowStyleCode = `const myMiddleware = storeAPI => next => action => {
  console.log('[arrow] action:', action.type)
  return next(action)
}`

function functionStyleMiddleware(storeAPI: any): (next: any) => (action: any) => any {
  return function wrapDispatch(next: any): (action: any) => any {
    return function handleAction(action: any): any {
      con.log('  📦 [function-стиль] action: ' + action.type)
      return next(action)
    }
  }
}

const arrowStyleMiddleware: (storeAPI: any) => (next: any) => (action: any) => any =
  (_storeAPI: any) => (next: any) => (action: any) => {
    con.log('  ⚡ [arrow-стиль] action: ' + action.type)
    return next(action)
  }

let currentStyle: 'arrow' | 'function' = 'arrow'
let store = createStore(rootReducer, applyMiddleware(arrowStyleMiddleware))

const codeDisplay = document.getElementById('code-display')!
const syntaxLabel = document.getElementById('syntax-label')!
const stateDisplay = document.getElementById('state-display')!
const btnFunction = document.getElementById('btn-function')!
const btnArrow = document.getElementById('btn-arrow')!

function updateCodeDisplay(): void {
  if (currentStyle === 'function') {
    codeDisplay.textContent = functionStyleCode
    syntaxLabel.textContent = 'Текущий синтаксис: function'
    btnFunction.classList.add('btn--accent')
    btnArrow.classList.remove('btn--accent')
  } else {
    codeDisplay.textContent = arrowStyleCode
    syntaxLabel.textContent = 'Текущий синтаксис: arrow'
    btnArrow.classList.add('btn--accent')
    btnFunction.classList.remove('btn--accent')
  }
}

function render(): void {
  stateDisplay.textContent = JSON.stringify(store.getState(), null, 2)
}

function switchStyle(style: 'arrow' | 'function'): void {
  currentStyle = style
  const currentState = store.getState()

  if (style === 'function') {
    store = createStore(rootReducer, currentState, applyMiddleware(functionStyleMiddleware))
  } else {
    store = createStore(rootReducer, currentState, applyMiddleware(arrowStyleMiddleware))
  }

  store.subscribe(render)
  updateCodeDisplay()
  render()
  con.info(`Переключено на ${style}-стиль (state сохранён)`)
}

store.subscribe(render)
render()
updateCodeDisplay()

let dispatchCount = 0

document.getElementById('btn-dispatch')!.addEventListener('click', (): void => {
  dispatchCount++
  con.info(`─── Dispatch #${dispatchCount} (${currentStyle}-стиль) ───`)
  store.dispatch({ type: 'increment' })
  con.success('  ✔ state: ' + JSON.stringify(store.getState()))
  con.log('')
})

btnFunction.addEventListener('click', (): void => {
  switchStyle('function')
})

btnArrow.addEventListener('click', (): void => {
  switchStyle('arrow')
})

document.getElementById('btn-clear')!.addEventListener('click', (): void => {
  con.clear()
  con.info('Лог очищен')
})

con.info('Два синтаксиса middleware — одинаковый результат')
con.log('Переключайте между function и arrow стилями и делайте dispatch')
