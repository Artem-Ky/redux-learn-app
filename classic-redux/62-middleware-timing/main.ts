import { legacy_createStore as createStore, applyMiddleware } from 'redux'
import { ConsolePanel } from '../shared/console-panel'

interface CounterState {
  value: number
}

interface IncrementAction {
  type: 'counter/incremented'
}

interface SlowIncrementAction {
  type: 'counter/slowIncremented'
}

interface DecrementAction {
  type: 'counter/decremented'
}

type CounterAction =
  | IncrementAction
  | SlowIncrementAction
  | DecrementAction
  | { type: string }

function counterReducer(state: CounterState = { value: 0 }, action: CounterAction): CounterState {
  switch (action.type) {
    case 'counter/incremented':
      return { value: state.value + 1 }
    case 'counter/slowIncremented': {
      let sum = 0
      for (let i = 0; i < 5_000_000; i++) {
        sum += Math.sqrt(i)
      }
      void sum
      return { value: state.value + 1 }
    }
    case 'counter/decremented':
      return { value: state.value - 1 }
    default:
      return state
  }
}

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

const timingMiddleware =
  (storeAPI: any) => (next: any) => (action: any): any => {
    const start = performance.now()
    const result = next(action)
    const end = performance.now()
    const duration = (end - start).toFixed(2)

    const msg = `${action.type} took ${duration}ms`

    const ms = end - start
    if (ms > 1) {
      consolePanel.warn(`⏱ ${msg} — SLOW!`)
    } else {
      consolePanel.success(`⏱ ${msg}`)
    }

    const timingEl = document.getElementById('timing-display')!
    timingEl.textContent = msg
    timingEl.style.color = ms > 1 ? 'var(--accent-orange)' : 'var(--accent-green)'

    return result
  }

const store = createStore(counterReducer, applyMiddleware(timingMiddleware))

consolePanel.success('Store создан с timingMiddleware')
consolePanel.info('«Fast +1» — мгновенный reducer')
consolePanel.info('«Slow +1» — reducer с тяжёлым циклом (заметная задержка)')

function render(): void {
  const state = store.getState() as CounterState
  document.getElementById('state-display')!.textContent = JSON.stringify(state, null, 2)
}

store.subscribe(render)
render()

document.getElementById('btn-fast')!.addEventListener('click', (): void => {
  consolePanel.log(`dispatch({ type: 'counter/incremented' })`)
  store.dispatch({ type: 'counter/incremented' })
})

document.getElementById('btn-slow')!.addEventListener('click', (): void => {
  consolePanel.log(`dispatch({ type: 'counter/slowIncremented' }) — тяжёлый reducer...`)
  store.dispatch({ type: 'counter/slowIncremented' })
})

document.getElementById('btn-decrement')!.addEventListener('click', (): void => {
  consolePanel.log(`dispatch({ type: 'counter/decremented' })`)
  store.dispatch({ type: 'counter/decremented' })
})
