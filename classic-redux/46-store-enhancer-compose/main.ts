import { legacy_createStore as createStore, compose, type StoreEnhancer } from 'redux'
import { ConsolePanel } from '../shared/console-panel'

interface CounterState {
  value: number
}

type CounterAction =
  | { type: 'counter/incremented' }
  | { type: 'counter/decremented' }
  | { type: 'counter/added'; payload: number }
  | { type: 'counter/reset' }
  | { type: string }

const initialState: CounterState = { value: 0 }

function counterReducer(state: CounterState = initialState, action: CounterAction): CounterState {
  switch (action.type) {
    case 'counter/incremented':
      return { value: state.value + 1 }
    case 'counter/decremented':
      return { value: state.value - 1 }
    case 'counter/added':
      return { value: state.value + (action as { type: string; payload: number }).payload }
    case 'counter/reset':
      return { value: 0 }
    default:
      return state
  }
}

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

const logEnhancer: StoreEnhancer = (next) => (reducer, preloadedState) => {
  const store = next(reducer, preloadedState)
  const originalDispatch = store.dispatch

  const wrappedDispatch = (action: any): any => {
    consolePanel.info(`📋 dispatch: ${JSON.stringify(action)}`)
    const result = originalDispatch(action)
    consolePanel.log(`📋 new state: ${JSON.stringify(store.getState())}`)
    return result
  }

  return { ...store, dispatch: wrappedDispatch }
}

let lastUpdated = new Date().toLocaleTimeString('ru-RU', { hour12: false })

const timestampEnhancer: StoreEnhancer = (next) => (reducer, preloadedState) => {
  const store = next(reducer, preloadedState)

  const originalDispatch = store.dispatch
  const wrappedDispatch = (action: any): any => {
    lastUpdated = new Date().toLocaleTimeString('ru-RU', { hour12: false })
    return originalDispatch(action)
  }

  consolePanel.success('⏱ timestampEnhancer: каждый dispatch обновляет lastUpdated')

  return { ...store, dispatch: wrappedDispatch }
}

const composedEnhancer = compose(logEnhancer, timestampEnhancer)

const store = createStore(counterReducer, composedEnhancer as StoreEnhancer)

consolePanel.info('Store создан с compose(logEnhancer, timestampEnhancer)')
consolePanel.log('Начальный state:', store.getState())

function render(): void {
  const state = store.getState() as CounterState
  document.getElementById('counter-value')!.textContent = String(state.value)
  document.getElementById('state-display')!.textContent = JSON.stringify(
    { value: state.value, lastUpdated },
    null, 2
  )
}

store.subscribe(render)
render()

document.getElementById('btn-increment')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'counter/incremented' })
})

document.getElementById('btn-decrement')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'counter/decremented' })
})

document.getElementById('btn-add5')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'counter/added', payload: 5 })
})

document.getElementById('btn-reset')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'counter/reset' })
  consolePanel.warn('Счётчик сброшен')
})
