import { legacy_createStore as createStore } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'
import { ConsolePanel } from '../shared/console-panel'

interface CounterState {
  value: number
}

interface CounterAction {
  type: string
  payload?: number
}

const initialState: CounterState = { value: 0 }

function counterReducer(
  state: CounterState = initialState,
  action: CounterAction
): CounterState {
  switch (action.type) {
    case 'counter/incremented':
      return { ...state, value: state.value + 1 }
    case 'counter/decremented':
      return { ...state, value: state.value - 1 }
    case 'counter/addAmount':
      return { ...state, value: state.value + (action.payload ?? 0) }
    case 'counter/multiplied':
      return { ...state, value: state.value * (action.payload ?? 1) }
    case 'counter/reset':
      return { value: 0 }
    default:
      return state
  }
}

const store = createStore(counterReducer)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const con = new ConsolePanel(document.getElementById('console-container')!, 'Reducer Log')

function render(): void {
  const state = store.getState()
  document.getElementById('counter-value')!.textContent = String(state.value)
  document.getElementById('state-display')!.textContent = JSON.stringify(state, null, 2)
}

function showAction(action: CounterAction): void {
  document.getElementById('action-display')!.textContent = JSON.stringify(action, null, 2)
}

function dispatchAndLog(action: CounterAction): void {
  const stateBefore = store.getState()
  showAction(action)
  store.dispatch(action)
  const stateAfter = store.getState()

  con.info(`dispatch: ${JSON.stringify(action)}`)
  con.log(`  state до:    ${JSON.stringify(stateBefore)}`)
  con.log(`  state после: ${JSON.stringify(stateAfter)}`)

  if (stateBefore === stateAfter) {
    con.warn('  → state НЕ изменился (та же ссылка)')
  } else {
    con.success(`  → state изменился: ${stateBefore.value} → ${stateAfter.value}`)
  }
  con.log('')
}

store.subscribe(render)
render()

con.info('Нажимайте кнопки и наблюдайте state до/после каждого dispatch')

document.getElementById('btn-inc')!.addEventListener('click', (): void => {
  dispatchAndLog({ type: 'counter/incremented' })
})

document.getElementById('btn-dec')!.addEventListener('click', (): void => {
  dispatchAndLog({ type: 'counter/decremented' })
})

document.getElementById('btn-add5')!.addEventListener('click', (): void => {
  dispatchAndLog({ type: 'counter/addAmount', payload: 5 })
})

document.getElementById('btn-mul2')!.addEventListener('click', (): void => {
  dispatchAndLog({ type: 'counter/multiplied', payload: 2 })
})

document.getElementById('btn-reset')!.addEventListener('click', (): void => {
  dispatchAndLog({ type: 'counter/reset' })
})

document.getElementById('btn-unknown')!.addEventListener('click', (): void => {
  dispatchAndLog({ type: 'some/unknownAction' })
})
