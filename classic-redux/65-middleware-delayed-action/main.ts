import { legacy_createStore as createStore, applyMiddleware } from 'redux'
import { ConsolePanel } from '../shared/console-panel'

interface CounterState {
  value: number
}

interface IncrementAction {
  type: 'counter/incremented'
}

interface DelayedIncrementAction {
  type: 'counter/delayedIncrement'
}

type CounterAction =
  | IncrementAction
  | DelayedIncrementAction
  | { type: string }

function counterReducer(state: CounterState = { value: 0 }, action: CounterAction): CounterState {
  switch (action.type) {
    case 'counter/incremented':
      return { value: state.value + 1 }
    default:
      return state
  }
}

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

function formatTime(): string {
  return new Date().toLocaleTimeString('ru-RU', { hour12: false })
}

const delayMiddleware =
  (storeAPI: any) => (next: any) => (action: any): any => {
    if (action.type === 'counter/delayedIncrement') {
      const startTime = formatTime()
      consolePanel.warn(`⏳ [${startTime}] Перехвачен counter/delayedIncrement — ждём 1 секунду...`)

      const indicatorEl = document.getElementById('delay-indicator')!
      indicatorEl.classList.add('active')

      const statusEl = document.getElementById('status-display')!
      statusEl.textContent = 'Ожидание... (1 секунда)'
      statusEl.style.color = 'var(--accent-orange)'

      setTimeout((): void => {
        const endTime = formatTime()
        consolePanel.success(`✅ [${endTime}] Задержка завершена — dispatch counter/incremented`)
        indicatorEl.classList.remove('active')
        statusEl.textContent = 'Готово'
        statusEl.style.color = 'var(--accent-green)'

        storeAPI.dispatch({ type: 'counter/incremented' })
      }, 1000)

      return undefined
    }

    return next(action)
  }

const store = createStore(counterReducer, applyMiddleware(delayMiddleware))

consolePanel.success('Store создан с delayMiddleware')
consolePanel.info('«Instant +1» — обычный dispatch, мгновенный')
consolePanel.info('«Delayed +1» — middleware перехватит и отложит на 1 секунду')

function render(): void {
  const state = store.getState() as CounterState
  document.getElementById('state-display')!.textContent = JSON.stringify(state, null, 2)
}

store.subscribe(render)
render()

document.getElementById('btn-instant')!.addEventListener('click', (): void => {
  const time = formatTime()
  consolePanel.log(`[${time}] dispatch({ type: 'counter/incremented' })`)
  store.dispatch({ type: 'counter/incremented' })
  consolePanel.success(`[${time}] Мгновенно! Состояние: ${JSON.stringify(store.getState())}`)
})

document.getElementById('btn-delayed')!.addEventListener('click', (): void => {
  const time = formatTime()
  consolePanel.log(`[${time}] dispatch({ type: 'counter/delayedIncrement' })`)
  store.dispatch({ type: 'counter/delayedIncrement' })
})
