import { legacy_createStore as createStore, applyMiddleware } from 'redux'
import { ConsolePanel } from '../shared/console-panel'

interface CounterState {
  value: number
}

interface IncrementAction {
  type: 'counter/incremented'
}

interface CrashAction {
  type: 'counter/crash'
}

type CounterAction = IncrementAction | CrashAction | { type: string }

function counterReducer(state: CounterState = { value: 0 }, action: CounterAction): CounterState {
  switch (action.type) {
    case 'counter/incremented':
      return { value: state.value + 1 }
    case 'counter/crash':
      throw new Error('Reducer взорвался! Неожиданная ошибка в counter/crash')
    default:
      return state
  }
}

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

const crashReporter =
  (storeAPI: any) => (next: any) => (action: any): any => {
    try {
      return next(action)
    } catch (err) {
      const error = err as Error
      const state = storeAPI.getState()

      consolePanel.error(`🔥 Caught exception in reducer!`)
      consolePanel.error(`   Action: ${JSON.stringify(action)}`)
      consolePanel.error(`   Error: ${error.message}`)
      consolePanel.warn(`   State при ошибке: ${JSON.stringify(state)}`)
      consolePanel.info(`   Приложение продолжает работу (graceful degradation)`)

      const statusEl = document.getElementById('status-display')!
      statusEl.textContent = `⚠ Ошибка перехвачена: ${error.message}`
      statusEl.style.color = 'var(--accent-red)'

      return undefined
    }
  }

const store = createStore(counterReducer, applyMiddleware(crashReporter))

consolePanel.success('Store создан с crashReporter middleware')
consolePanel.info('Нажмите «Normal +1» — работает нормально')
consolePanel.info('Нажмите «Crash!» — reducer выбросит ошибку, но middleware перехватит')

function render(): void {
  const state = store.getState() as CounterState
  document.getElementById('state-display')!.textContent = JSON.stringify(state, null, 2)
}

store.subscribe(render)
render()

document.getElementById('btn-increment')!.addEventListener('click', (): void => {
  consolePanel.log(`dispatch({ type: 'counter/incremented' })`)
  store.dispatch({ type: 'counter/incremented' })

  const statusEl = document.getElementById('status-display')!
  statusEl.textContent = 'Приложение работает нормально'
  statusEl.style.color = 'var(--accent-green)'

  consolePanel.success(`Состояние: ${JSON.stringify(store.getState())}`)
})

document.getElementById('btn-crash')!.addEventListener('click', (): void => {
  consolePanel.warn(`dispatch({ type: 'counter/crash' }) — reducer выбросит ошибку!`)
  store.dispatch({ type: 'counter/crash' })
})
