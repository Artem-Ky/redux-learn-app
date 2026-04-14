import { ConsolePanel } from '../shared/console-panel'

const con = new ConsolePanel(document.getElementById('console-container')!, 'Проверка ссылок')

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
  company: Company
}

interface AppState {
  user: User
}

function createInitialState(): AppState {
  return {
    user: {
      name: 'Иван',
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

let state = createInitialState()

function renderObj(): void {
  document.getElementById('obj-display')!.textContent = JSON.stringify(state, null, 2)
}

function renderRefs(original: AppState, updated: AppState): void {
  const lines = [
    `state === newState:                       ${original === updated}`,
    `state.user === newState.user:              ${original.user === updated.user}`,
    `state.user.company === ...company:         ${original.user.company === updated.user.company}`,
    `state.user.company.address === ...address: ${original.user.company.address === updated.user.company.address}`,
  ]
  document.getElementById('refs-display')!.textContent = lines.join('\n')
}

document.getElementById('btn-mutate')!.addEventListener('click', () => {
  const original = state
  con.warn('─── МУТАЦИЯ: state.user.company.address.city = "Новосибирск" ───')
  con.log(`До: city = "${state.user.company.address.city}"`)

  state.user.company.address.city = 'Новосибирск'

  con.log(`После: city = "${state.user.company.address.city}"`)
  con.error(`state === original: ${state === original} ← ссылка НЕ изменилась!`)
  con.error(`address === original.address: ${state.user.company.address === original.user.company.address}`)
  con.error('Все ссылки остались прежними. Redux не обнаружит изменение.')
  con.log('')

  renderObj()
  renderRefs(original, state)
})

document.getElementById('btn-immutable')!.addEventListener('click', () => {
  const original = state
  con.success('─── ИММУТАБЕЛЬНО: каскадный spread ───')
  con.log(`До: city = "${state.user.company.address.city}"`)

  const newState: AppState = {
    ...state,
    user: {
      ...state.user,
      company: {
        ...state.user.company,
        address: {
          ...state.user.company.address,
          city: 'Новосибирск'
        }
      }
    }
  }

  con.log(`После: city = "${newState.user.company.address.city}"`)
  con.log(`Оригинал: city = "${original.user.company.address.city}" ← не изменился!`)
  con.info(`state === newState: ${original === newState}`)
  con.info(`user === newUser: ${original.user === newState.user}`)
  con.info(`company === newCompany: ${original.user.company === newState.user.company}`)
  con.info(`address === newAddress: ${original.user.company.address === newState.user.company.address}`)
  con.success('Все изменённые уровни получили новые ссылки!')
  con.log('')

  state = newState
  renderObj()
  renderRefs(original, newState)
})

document.getElementById('btn-reset')!.addEventListener('click', () => {
  state = createInitialState()
  renderObj()
  document.getElementById('refs-display')!.textContent = '—'
  con.clear()
  con.info('Объект сброшен')
})

con.info('Попробуйте оба подхода и посмотрите на ссылки')
renderObj()
