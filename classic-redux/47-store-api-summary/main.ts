import { legacy_createStore as createStore } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'
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

type CounterAction =
  | IncrementAction
  | DecrementAction
  | { type: string }

const initialState: CounterState = { value: 0 }

function counterReducer(state: CounterState = initialState, action: CounterAction): CounterState {
  switch (action.type) {
    case 'counter/incremented':
      return { value: state.value + 1 }
    case 'counter/decremented':
      return { value: state.value - 1 }
    default:
      return state
  }
}

function doubleStepReducer(state: CounterState = initialState, action: CounterAction): CounterState {
  switch (action.type) {
    case 'counter/incremented':
      return { value: state.value + 2 }
    case 'counter/decremented':
      return { value: state.value - 2 }
    default:
      return state
  }
}

const store = createStore(counterReducer)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)
consolePanel.info('Store создан. Попробуйте каждый метод API!')

let listenerCount = 1
let isDoubleStep = false
const unsubscribers: Array<() => void> = []

const baseUnsubscribe = store.subscribe((): void => {
  updateGetStateOutput()
})
unsubscribers.push(baseUnsubscribe)

function updateGetStateOutput(): void {
  const state = store.getState()
  document.getElementById('getstate-output')!.textContent = JSON.stringify(state, null, 2)
}

updateGetStateOutput()

document.getElementById('btn-getstate')!.addEventListener('click', (): void => {
  const state = store.getState()
  document.getElementById('getstate-output')!.textContent = JSON.stringify(state, null, 2)
  consolePanel.log('getState() →', state)
})

document.getElementById('btn-dispatch')!.addEventListener('click', (): void => {
  const action = { type: 'counter/incremented' as const }
  store.dispatch(action)
  const newState = store.getState()
  document.getElementById('dispatch-output')!.textContent =
    `dispatched: ${JSON.stringify(action)}\nnew state: ${JSON.stringify(newState)}`
  consolePanel.success(`dispatch(${JSON.stringify(action)}) → value: ${newState.value}`)
})

document.getElementById('btn-subscribe')!.addEventListener('click', (): void => {
  listenerCount++
  const num = listenerCount
  const unsub = store.subscribe((): void => {
    const state = store.getState()
    consolePanel.log(`Listener #${num}: state.value = ${state.value}`)
  })
  unsubscribers.push(unsub)

  document.getElementById('listener-count')!.textContent = String(listenerCount)
  document.getElementById('subscribe-output')!.textContent =
    `Добавлен listener #${num}\nВсего: ${listenerCount} listener(s)\nsubscribe() вернул unsubscribe()`
  consolePanel.info(`subscribe(): добавлен listener #${num}. Всего: ${listenerCount}`)
})

document.getElementById('btn-replace')!.addEventListener('click', (): void => {
  if (isDoubleStep) {
    store.replaceReducer(counterReducer)
    isDoubleStep = false
    document.getElementById('replace-output')!.textContent =
      'counterReducer (шаг: 1)\nreducerReducer заменён!'
    consolePanel.warn('replaceReducer → counterReducer (шаг: ±1)')
  } else {
    store.replaceReducer(doubleStepReducer)
    isDoubleStep = true
    document.getElementById('replace-output')!.textContent =
      'doubleStepReducer (шаг: 2)\nReducer заменён!'
    consolePanel.warn('replaceReducer → doubleStepReducer (шаг: ±2)')
  }

  const state = store.getState()
  consolePanel.log('State после replaceReducer:', state)
  updateGetStateOutput()
})
