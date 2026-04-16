import { produce } from 'immer'
import { ConsolePanel } from '../shared/console-panel'

interface Address {
  city: string
  zip: string
}

interface Company {
  name: string
  address: Address
}

interface User {
  name: string
  age: number
  company: Company
}

interface AppState {
  user: User
}

function createInitialState(): AppState {
  return {
    user: {
      name: 'Иван',
      age: 30,
      company: {
        name: 'Рога и Копыта',
        address: {
          city: 'Москва',
          zip: '101000'
        }
      }
    }
  }
}

let currentState: AppState = createInitialState()

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)
const stateDisplay = document.getElementById('state-display')!
const btnSpread = document.getElementById('btn-spread')!
const btnImmer = document.getElementById('btn-immer')!
const btnReset = document.getElementById('btn-reset')!

function render(): void {
  stateDisplay.textContent = JSON.stringify(currentState, null, 2)
}

render()

consolePanel.info('🧊 Immer — иммутабельность через «мутации»')
consolePanel.log('')
consolePanel.log('Нажмите кнопки, чтобы сравнить два подхода:')
consolePanel.log('  • Spread — ручной каскад (многословно)')
consolePanel.log('  • Immer produce — одна строка (элегантно)')
consolePanel.log('')

btnSpread.addEventListener('click', (): void => {
  const prevState = currentState

  const newState: AppState = {
    ...prevState,
    user: {
      ...prevState.user,
      company: {
        ...prevState.user.company,
        address: {
          ...prevState.user.company.address,
          city: 'Новосибирск'
        }
      }
    }
  }

  consolePanel.log('─── Ручной Spread ───')
  consolePanel.log('Код: 8+ строк вложенных spread-операторов')
  consolePanel.log('')
  consolePanel.log(`  prevState.user.company.address.city = "${prevState.user.company.address.city}"`)
  consolePanel.log(`  newState.user.company.address.city  = "${newState.user.company.address.city}"`)
  consolePanel.log('')
  consolePanel.info(`  prevState === newState? ${prevState === newState}`)
  consolePanel.info(`  prevState.user === newState.user? ${prevState.user === newState.user}`)
  consolePanel.info(`  prevState.user.company.address === newState.user.company.address? ${prevState.user.company.address === newState.user.company.address}`)
  consolePanel.success('  ✅ Иммутабельно, но МНОГОСЛОВНО')
  consolePanel.log('')

  currentState = newState
  render()
})

btnImmer.addEventListener('click', (): void => {
  const prevState = currentState

  const newState = produce(prevState, draft => {
    draft.user.company.address.city = 'Новосибирск'
  })

  consolePanel.log('─── Immer produce ───')
  consolePanel.log('Код: draft.user.company.address.city = "Новосибирск"')
  consolePanel.log('     (ОДНА строка!)')
  consolePanel.log('')
  consolePanel.log(`  prevState.user.company.address.city = "${prevState.user.company.address.city}"`)
  consolePanel.log(`  newState.user.company.address.city  = "${newState.user.company.address.city}"`)
  consolePanel.log('')
  consolePanel.info(`  prevState === newState? ${prevState === newState}`)
  consolePanel.info(`  prevState.user === newState.user? ${prevState.user === newState.user}`)
  consolePanel.info(`  prevState.user.company.address === newState.user.company.address? ${prevState.user.company.address === newState.user.company.address}`)
  consolePanel.success('  ✅ Иммутабельно И ЛАКОНИЧНО')
  consolePanel.log('')

  currentState = newState
  render()
})

btnReset.addEventListener('click', (): void => {
  currentState = createInitialState()
  render()
  consolePanel.warn('🔄 Состояние сброшено')
  consolePanel.log('')
})
