import { legacy_createStore as createStore } from 'redux'
import { ConsolePanel } from '../shared/console-panel'

interface CounterState {
  value: number
}

interface CounterAction {
  type: string
  payload?: number
}

const initialState: CounterState = { value: 0 }

function reducerWithDefault(
  state: CounterState = initialState,
  action: CounterAction
): CounterState {
  switch (action.type) {
    case 'counter/incremented':
      return { ...state, value: state.value + 1 }
    case 'counter/decremented':
      return { ...state, value: state.value - 1 }
    default:
      return state
  }
}

function reducerWithoutDefault(
  state: CounterState | undefined,
  action: CounterAction
): CounterState | undefined {
  if (state === undefined) {
    return undefined
  }
  switch (action.type) {
    case 'counter/incremented':
      return { ...state, value: state.value + 1 }
    case 'counter/decremented':
      return { ...state, value: state.value - 1 }
    default:
      return state
  }
}

const storeA = createStore(reducerWithDefault)

const storeB = createStore(
  reducerWithoutDefault as Parameters<typeof createStore>[0],
  undefined as unknown as CounterState
)

const con = new ConsolePanel(document.getElementById('console-container')!, 'Initial State Log')

function renderA(): void {
  const state = storeA.getState()
  document.getElementById('state-a')!.textContent = JSON.stringify(state, null, 2)
}

function renderB(): void {
  const state = storeB.getState()
  document.getElementById('state-b')!.textContent =
    state === undefined ? 'undefined' : JSON.stringify(state, null, 2)
}

storeA.subscribe(renderA)
storeB.subscribe(renderB)

con.info('=== Инициализация Store A (с default-параметром) ===')
con.success(`storeA.getState() → ${JSON.stringify(storeA.getState())}`)
con.log('')

con.info('=== Инициализация Store B (без default-параметра) ===')
const stateBVal = storeB.getState()
if (stateBVal === undefined) {
  con.error('storeB.getState() → undefined')
  con.warn('Без default-параметра state остался undefined!')
} else {
  con.log(`storeB.getState() → ${JSON.stringify(stateBVal)}`)
}
con.log('')

renderA()
renderB()

document.getElementById('btn-inc-a')!.addEventListener('click', (): void => {
  const before = storeA.getState()
  storeA.dispatch({ type: 'counter/incremented' })
  const after = storeA.getState()
  con.success(`Store A: ${before.value} → ${after.value}`)
})

document.getElementById('btn-dec-a')!.addEventListener('click', (): void => {
  const before = storeA.getState()
  storeA.dispatch({ type: 'counter/decremented' })
  const after = storeA.getState()
  con.success(`Store A: ${before.value} → ${after.value}`)
})

document.getElementById('btn-inc-b')!.addEventListener('click', (): void => {
  const before = storeB.getState()
  try {
    storeB.dispatch({ type: 'counter/incremented' })
    const after = storeB.getState()
    if (after === undefined) {
      con.error('Store B: state остался undefined после dispatch')
    } else {
      con.log(`Store B: ${JSON.stringify(before)} → ${JSON.stringify(after)}`)
    }
    renderB()
  } catch (e) {
    con.error(`Store B: Ошибка — ${(e as Error).message}`)
  }
})

document.getElementById('btn-dec-b')!.addEventListener('click', (): void => {
  const before = storeB.getState()
  try {
    storeB.dispatch({ type: 'counter/decremented' })
    const after = storeB.getState()
    if (after === undefined) {
      con.error('Store B: state остался undefined после dispatch')
    } else {
      con.log(`Store B: ${JSON.stringify(before)} → ${JSON.stringify(after)}`)
    }
    renderB()
  } catch (e) {
    con.error(`Store B: Ошибка — ${(e as Error).message}`)
  }
})

document.getElementById('btn-init')!.addEventListener('click', (): void => {
  con.info('─── Ручная отправка @@INIT ───')

  con.log('Store A до @@INIT: ' + JSON.stringify(storeA.getState()))
  storeA.dispatch({ type: '@@INIT' })
  con.success('Store A после @@INIT: ' + JSON.stringify(storeA.getState()))
  con.log('  → default case вернул текущий state (без изменений)')

  con.log('')

  con.log('Store B до @@INIT: ' + (storeB.getState() === undefined ? 'undefined' : JSON.stringify(storeB.getState())))
  storeB.dispatch({ type: '@@INIT' })
  const stateB = storeB.getState()
  if (stateB === undefined) {
    con.error('Store B после @@INIT: undefined')
    con.warn('  → Без default-параметра state так и остался undefined!')
  } else {
    con.log('Store B после @@INIT: ' + JSON.stringify(stateB))
  }

  con.log('')
  renderA()
  renderB()
})
