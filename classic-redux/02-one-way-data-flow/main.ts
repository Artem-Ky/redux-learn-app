import { ConsolePanel } from '../shared/console-panel'

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог потока данных')

interface AppState {
  count: number
}

let state: AppState = { count: 0 }

const steps = ['step-state', 'step-view', 'step-action']

function highlight(stepId: string): void {
  steps.forEach(id => document.getElementById(id)?.classList.remove('active'))
  document.getElementById(stepId)?.classList.add('active')
  setTimeout(() => document.getElementById(stepId)?.classList.remove('active'), 600)
}

function render(): void {
  document.getElementById('counter-display')!.textContent = String(state.count)
  document.getElementById('state-value')!.textContent = JSON.stringify(state)
  highlight('step-view')
}

function updateState(newState: AppState, actionName: string): void {
  const prevState = state
  state = newState

  highlight('step-action')
  con.log(`ACTION: "${actionName}"`)
  con.log(`  prev state: ${JSON.stringify(prevState)}`)
  con.log(`  new  state: ${JSON.stringify(state)}`)
  con.info(`  prev === new: ${prevState === state ? 'true (та же ссылка!)' : 'false (новый объект)'}`)

  setTimeout(() => {
    highlight('step-state')
    setTimeout(() => render(), 300)
  }, 300)
}

document.getElementById('btn-inc')!.addEventListener('click', () => {
  updateState({ ...state, count: state.count + 1 }, 'increment')
})

document.getElementById('btn-dec')!.addEventListener('click', () => {
  updateState({ ...state, count: state.count - 1 }, 'decrement')
})

document.getElementById('btn-reset')!.addEventListener('click', () => {
  updateState({ count: 0 }, 'reset')
})

con.info('Однонаправленный поток: Action → State → View')
con.log('Нажимайте кнопки и следите за потоком данных')
render()
