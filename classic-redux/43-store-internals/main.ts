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

interface MiniStore<S> {
  getState: () => S
  dispatch: (action: { type: string; [key: string]: unknown }) => void
  subscribe: (listener: () => void) => () => void
}

function miniCreateStore<S>(
  reducer: (state: S | undefined, action: { type: string }) => S,
  preloadedState?: S
): MiniStore<S> {
  let state: S = preloadedState !== undefined
    ? preloadedState
    : reducer(undefined, { type: '@@INIT' })
  let listeners: Array<() => void> = []

  function getState(): S {
    return state
  }

  function dispatch(action: { type: string; [key: string]: unknown }): void {
    state = reducer(state, action)
    listeners.forEach(listener => listener())
  }

  function subscribe(listener: () => void): () => void {
    listeners.push(listener)
    return (): void => {
      listeners = listeners.filter(l => l !== listener)
    }
  }

  return { getState, dispatch, subscribe }
}

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

const store = miniCreateStore(counterReducer)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)
consolePanel.success('miniCreateStore работает! Redux НЕ импортирован.')
consolePanel.info('@@INIT вызван → reducer вернул default state')
consolePanel.log('store.getState() →', store.getState())

const miniSource = `function miniCreateStore(reducer, preloadedState?) {
  let state = preloadedState
  let listeners = []

  // Инициализация: @@INIT
  if (state === undefined) {
    state = reducer(undefined, { type: '@@INIT' })
  }

  function getState() {
    return state
  }

  function dispatch(action) {
    state = reducer(state, action)       // 1. Вызываем reducer
    listeners.forEach(fn => fn())        // 2. Уведомляем подписчиков
  }

  function subscribe(listener) {
    listeners.push(listener)
    return () => {                       // Возвращаем unsubscribe
      listeners = listeners.filter(l => l !== listener)
    }
  }

  return { getState, dispatch, subscribe }
}`

document.getElementById('source-display')!.textContent = miniSource

function render(): void {
  const state = store.getState()
  document.getElementById('state-display')!.textContent = JSON.stringify(state, null, 2)
}

store.subscribe(render)
render()

store.subscribe((): void => {
  consolePanel.log('[listener] state изменился →', store.getState())
})

document.getElementById('btn-increment')!.addEventListener('click', (): void => {
  consolePanel.info('dispatch({ type: "counter/increment" })')
  consolePanel.log('  1. reducer(state, action) → новый state')
  consolePanel.log('  2. listeners.forEach(fn => fn()) → уведомление')
  store.dispatch({ type: 'counter/increment' })
})

document.getElementById('btn-decrement')!.addEventListener('click', (): void => {
  consolePanel.info('dispatch({ type: "counter/decrement" })')
  store.dispatch({ type: 'counter/decrement' })
})

document.getElementById('btn-reset')!.addEventListener('click', (): void => {
  consolePanel.warn('dispatch({ type: "counter/reset" })')
  store.dispatch({ type: 'counter/reset' })
})
