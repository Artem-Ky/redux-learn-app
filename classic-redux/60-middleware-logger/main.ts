import { legacy_createStore as createStore, applyMiddleware } from 'redux'
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

interface AddAction {
  type: 'counter/add'
  payload: number
}

type CounterAction = IncrementAction | DecrementAction | ResetAction | AddAction | { type: string }

const initialState: CounterState = { value: 0 }

function counterReducer(state: CounterState = initialState, action: CounterAction): CounterState {
  switch (action.type) {
    case 'counter/increment':
      return { value: state.value + 1 }
    case 'counter/decrement':
      return { value: state.value - 1 }
    case 'counter/reset':
      return { value: 0 }
    case 'counter/add':
      return { value: state.value + (action as AddAction).payload }
    default:
      return state
  }
}

const con = new ConsolePanel(document.getElementById('console-container')!, 'Logger middleware — вывод')

const loggerMiddleware: (storeAPI: any) => (next: any) => (action: any) => any =
  (storeAPI: any) => (next: any) => (action: any) => {
    con.info(`dispatching  ${JSON.stringify(action)}`)
    con.log(`  prev state: ${JSON.stringify(storeAPI.getState())}`)

    let result = next(action)

    con.success(`  next state: ${JSON.stringify(storeAPI.getState())}`)
    con.log('')
    return result
  }

const store = createStore(
  counterReducer,
  applyMiddleware(loggerMiddleware)
)

function render(): void {
  const state = store.getState()
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

document.getElementById('btn-add5')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'counter/add', payload: 5 })
})

con.info('Logger middleware подключён к store')
con.log('Каждый dispatch будет логировать: action, prev state, next state')
con.log('Нажмите кнопки счётчика, чтобы увидеть логирование')
con.log('')
