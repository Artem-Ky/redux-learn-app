import { legacy_createStore as createStore } from 'redux'
import { ConsolePanel } from '../shared/console-panel'

interface CounterState {
  value: number
}

interface IncrementAction {
  type: 'counter/increment'
}

interface DecrementAction {
  type: 'counter/decrement'
}

interface ResetAction {
  type: 'counter/reset'
}

type CounterAction = IncrementAction | DecrementAction | ResetAction | { type: string }

interface ReduxStore {
  getState: () => CounterState
  dispatch: (action: { type: string }) => { type: string }
  subscribe: (listener: () => void) => () => void
  replaceReducer: (nextReducer: (state: CounterState | undefined, action: CounterAction) => CounterState) => void
}

type CreateStoreFn = (
  reducer: (state: CounterState | undefined, action: CounterAction) => CounterState,
  preloadedState?: CounterState
) => ReduxStore

function counterReducer(state: CounterState = { value: 0 }, action: CounterAction): CounterState {
  switch (action.type) {
    case 'counter/increment':
      return { value: state.value + 1 }
    case 'counter/decrement':
      return { value: state.value - 1 }
    case 'counter/reset':
      return { value: 0 }
    default:
      return state
  }
}

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

function logEnhancer(originalCreateStore: CreateStoreFn) {
  return (reducer: (state: CounterState | undefined, action: CounterAction) => CounterState, preloadedState?: CounterState): ReduxStore => {
    const store = originalCreateStore(reducer, preloadedState)
    const originalDispatch = store.dispatch

    store.dispatch = (action: { type: string }): { type: string } => {
      consolePanel.info(`[enhancer] 📤 action: ${JSON.stringify(action)}`)
      consolePanel.log(`[enhancer]    state до:    ${JSON.stringify(store.getState())}`)
      const result = originalDispatch(action)
      consolePanel.success(`[enhancer]    state после: ${JSON.stringify(store.getState())}`)
      return result
    }

    return store
  }
}

const store = createStore(
  counterReducer,
  logEnhancer as never
)

consolePanel.success('Store создан с logEnhancer (третий аргумент)')
consolePanel.log('Каждый dispatch будет логироваться enhancer\'ом')
consolePanel.log('store.getState() →', store.getState())

const enhancerSource = `function logEnhancer(createStore) {
  return (reducer, preloadedState) => {
    const store = createStore(reducer, preloadedState)
    const originalDispatch = store.dispatch

    store.dispatch = (action) => {
      console.log('[enhancer] action:', action)
      console.log('[enhancer] state до:', store.getState())
      const result = originalDispatch(action)
      console.log('[enhancer] state после:', store.getState())
      return result
    }

    return store
  }
}

// Передаём как третий аргумент:
const store = createStore(reducer, logEnhancer)`

document.getElementById('enhancer-source')!.textContent = enhancerSource

function render(): void {
  const state = store.getState() as CounterState
  document.getElementById('state-display')!.textContent = JSON.stringify(state, null, 2)
}

store.subscribe(render)
render()

document.getElementById('btn-increment')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'counter/increment' })
})

document.getElementById('btn-decrement')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'counter/decrement' })
})

document.getElementById('btn-reset')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'counter/reset' })
})
