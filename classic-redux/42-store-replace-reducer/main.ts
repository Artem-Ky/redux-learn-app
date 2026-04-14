import { legacy_createStore as createStore } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'
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

type CounterAction = IncrementAction | DecrementAction | { type: string }

function counterReducer(state: CounterState = { value: 0 }, action: CounterAction): CounterState {
  switch (action.type) {
    case 'counter/increment':
      return { value: state.value + 1 }
    case 'counter/decrement':
      return { value: state.value - 1 }
    default:
      return state
  }
}

function doubleReducer(state: CounterState = { value: 0 }, action: CounterAction): CounterState {
  switch (action.type) {
    case 'counter/increment':
      return { value: state.value + 2 }
    case 'counter/decrement':
      return { value: state.value - 2 }
    default:
      return state
  }
}

let isDouble = false
const store = createStore(counterReducer)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)
consolePanel.info('Store создан с counterReducer (шаг +1)')
consolePanel.log('store.getState() →', store.getState())

function render(): void {
  const state = store.getState() as CounterState
  document.getElementById('state-display')!.textContent = JSON.stringify(state, null, 2)

  const label = document.getElementById('reducer-label')!
  if (isDouble) {
    label.textContent = 'Активный reducer: doubleReducer (шаг ×2)'
    label.style.color = 'var(--success)'
  } else {
    label.textContent = 'Активный reducer: counterReducer (шаг +1)'
    label.style.color = 'var(--accent-orange)'
  }
}

store.subscribe(render)
render()

document.getElementById('btn-increment')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'counter/increment' })
  const step = isDouble ? 2 : 1
  consolePanel.log(`dispatch increment (шаг ${step}) →`, store.getState())
})

document.getElementById('btn-decrement')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'counter/decrement' })
  const step = isDouble ? 2 : 1
  consolePanel.log(`dispatch decrement (шаг ${step}) →`, store.getState())
})

document.getElementById('btn-switch-double')!.addEventListener('click', (): void => {
  if (isDouble) {
    consolePanel.warn('doubleReducer уже активен')
    return
  }
  store.replaceReducer(doubleReducer)
  isDouble = true
  consolePanel.success('replaceReducer → doubleReducer (шаг ×2)')
  consolePanel.info('Redux автоматически dispatched @@INIT')
  consolePanel.log('State сохранён:', store.getState())
  render()
})

document.getElementById('btn-switch-normal')!.addEventListener('click', (): void => {
  if (!isDouble) {
    consolePanel.warn('counterReducer уже активен')
    return
  }
  store.replaceReducer(counterReducer)
  isDouble = false
  consolePanel.success('replaceReducer → counterReducer (шаг +1)')
  consolePanel.info('Redux автоматически dispatched @@INIT')
  consolePanel.log('State сохранён:', store.getState())
  render()
})
