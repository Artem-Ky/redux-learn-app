import { legacy_createStore as createStore, compose } from 'redux'
import { ConsolePanel } from '../shared/console-panel'

interface CounterState {
  value: number
}

interface IncrementAction {
  type: 'counter/incremented'
}

interface DecrementAction {
  type: 'counter/decremented'
}

interface AddAction {
  type: 'counter/added'
  payload: number
}

interface ResetAction {
  type: 'counter/reset'
}

type CounterAction =
  | IncrementAction
  | DecrementAction
  | AddAction
  | ResetAction
  | { type: string }

const initialState: CounterState = { value: 0 }

function counterReducer(state: CounterState = initialState, action: CounterAction): CounterState {
  switch (action.type) {
    case 'counter/incremented':
      return { value: state.value + 1 }
    case 'counter/decremented':
      return { value: state.value - 1 }
    case 'counter/added':
      return { value: state.value + (action as AddAction).payload }
    case 'counter/reset':
      return { value: 0 }
    default:
      return state
  }
}

type StoreCreator = typeof createStore
type StoreEnhancer = (next: StoreCreator) => StoreCreator

const logEnhancer: StoreEnhancer = (next: StoreCreator): StoreCreator => {
  return ((reducer: any, preloadedState: any, enhancer: any) => {
    const store = next(reducer, preloadedState, enhancer)
    const originalDispatch = store.dispatch

    store.dispatch = (action: any): any => {
      consolePanel.info(`📋 dispatch: ${JSON.stringify(action)}`)
      const result = originalDispatch(action)
      consolePanel.log(`📋 new state: ${JSON.stringify(store.getState())}`)
      return result
    }

    return store
  }) as StoreCreator
}

const timestampEnhancer: StoreEnhancer = (next: StoreCreator): StoreCreator => {
  return ((reducer: any, preloadedState: any, enhancer: any) => {
    const store = next(reducer, preloadedState, enhancer)
    const originalGetState = store.getState

    store.getState = (): any => {
      const state = originalGetState()
      return {
        ...state,
        lastUpdated: new Date().toLocaleTimeString()
      }
    }

    consolePanel.success('⏱ timestampEnhancer: getState() теперь содержит lastUpdated')

    return store
  }) as StoreCreator
}

const composedEnhancer = compose(logEnhancer, timestampEnhancer)

const store = createStore(counterReducer, undefined, composedEnhancer as any)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)
consolePanel.info('Store создан с compose(logEnhancer, timestampEnhancer)')
consolePanel.log('Начальный state:', store.getState())

function render(): void {
  const state = store.getState() as CounterState & { lastUpdated?: string }
  document.getElementById('counter-value')!.textContent = String(state.value)
  document.getElementById('state-display')!.textContent = JSON.stringify(state, null, 2)
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
