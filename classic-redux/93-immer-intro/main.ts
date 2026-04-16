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
  tags: string[]
}

interface AppState {
  user: User
}

function createInitialState(): AppState {
  return {
    user: {
      name: 'Иван',
      age: 30,
      tags: ['redux', 'typescript'],
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
const btnSharing = document.getElementById('btn-sharing')!
const btnArray = document.getElementById('btn-array')!
const btnCurried = document.getElementById('btn-curried')!
const btnReducer = document.getElementById('btn-reducer')!
const btnReset = document.getElementById('btn-reset')!

function render(): void {
  stateDisplay.textContent = JSON.stringify(currentState, null, 2)
}

render()

consolePanel.info('Immer — иммутабельность через «мутации»')
consolePanel.log('')
consolePanel.log('Нажмите кнопки, чтобы увидеть разные возможности Immer:')
consolePanel.log('')

// ─── 1. Spread vs Immer ───

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

  consolePanel.warn('─── Ручной Spread ───')
  consolePanel.log('Код: 8+ строк вложенных spread-операторов')
  consolePanel.log('')
  consolePanel.log(`  city: "${prevState.user.company.address.city}" → "${newState.user.company.address.city}"`)
  consolePanel.info(`  prevState === newState? ${prevState === newState}`)
  consolePanel.info(`  prevState.user === newState.user? ${prevState.user === newState.user}`)
  consolePanel.success('  Иммутабельно, но МНОГОСЛОВНО')
  consolePanel.log('')

  currentState = newState
  render()
})

// ─── 2. Immer produce ───

btnImmer.addEventListener('click', (): void => {
  const prevState = currentState

  const newState = produce(prevState, draft => {
    draft.user.company.address.city = 'Новосибирск'
  })

  consolePanel.warn('─── Immer produce ───')
  consolePanel.log('Код: draft.user.company.address.city = "Новосибирск"')
  consolePanel.log('')
  consolePanel.log(`  city: "${prevState.user.company.address.city}" → "${newState.user.company.address.city}"`)
  consolePanel.info(`  prevState === newState? ${prevState === newState}`)
  consolePanel.info(`  prevState.user === newState.user? ${prevState.user === newState.user}`)
  consolePanel.success('  Иммутабельно И ЛАКОНИЧНО (1 строка)')
  consolePanel.log('')

  currentState = newState
  render()
})

// ─── 3. Structural sharing ───

btnSharing.addEventListener('click', (): void => {
  const prevState = currentState

  const newState = produce(prevState, draft => {
    draft.user.company.address.city = 'Казань'
  })

  consolePanel.warn('─── Structural Sharing ───')
  consolePanel.log('Immer переиспользует неизменённые части объекта:')
  consolePanel.log('')

  const checks = [
    { label: 'state', same: prevState === newState },
    { label: 'state.user', same: prevState.user === newState.user },
    { label: 'state.user.tags', same: prevState.user.tags === newState.user.tags },
    { label: 'state.user.company', same: prevState.user.company === newState.user.company },
    { label: 'state.user.company.address', same: prevState.user.company.address === newState.user.company.address },
  ]

  for (const { label, same } of checks) {
    if (same) {
      consolePanel.success(`  prev.${label} === new.${label}  →  true  (переиспользован!)`)
    } else {
      consolePanel.error(`  prev.${label} === new.${label}  →  false (новый объект)`)
    }
  }

  consolePanel.log('')
  consolePanel.info('Только путь к изменённому полю создаёт новые объекты.')
  consolePanel.info('Остальные ветви (tags) — та же самая ссылка.')
  consolePanel.log('')

  currentState = newState
  render()
})

// ─── 4. Arrays ───

btnArray.addEventListener('click', (): void => {
  const prevState = currentState

  const newState = produce(prevState, draft => {
    draft.user.tags.push('immer')
    draft.user.tags = draft.user.tags.filter(t => t !== 'redux')
  })

  consolePanel.warn('─── Массивы в Immer ───')
  consolePanel.log('Код:')
  consolePanel.log('  draft.user.tags.push("immer")')
  consolePanel.log('  draft.user.tags = draft.user.tags.filter(t => t !== "redux")')
  consolePanel.log('')
  consolePanel.log(`  tags до:    [${prevState.user.tags.map(t => `"${t}"`).join(', ')}]`)
  consolePanel.log(`  tags после: [${newState.user.tags.map(t => `"${t}"`).join(', ')}]`)
  consolePanel.info(`  prevState.user.tags === newState.user.tags? ${prevState.user.tags === newState.user.tags}`)
  consolePanel.success('  push, splice, sort, reverse — всё работает как обычно!')
  consolePanel.log('')

  currentState = newState
  render()
})

// ─── 5. Curried producer ───

btnCurried.addEventListener('click', (): void => {
  const prevState = currentState

  const setCity = produce((draft: AppState, city: string) => {
    draft.user.company.address.city = city
  })

  const newState = setCity(prevState, 'Екатеринбург')

  consolePanel.warn('─── Curried Producer ───')
  consolePanel.log('Код:')
  consolePanel.log('  const setCity = produce((draft, city) => {')
  consolePanel.log('    draft.user.company.address.city = city')
  consolePanel.log('  })')
  consolePanel.log('  const newState = setCity(prevState, "Екатеринбург")')
  consolePanel.log('')
  consolePanel.log(`  city: "${prevState.user.company.address.city}" → "${newState.user.company.address.city}"`)
  consolePanel.info('  Curried produce = переиспользуемая функция-трансформер.')
  consolePanel.info('  Идеально подходит как reducer: (state, action) => newState')
  consolePanel.log('')

  currentState = newState
  render()
})

// ─── 6. Immer as reducer ───

btnReducer.addEventListener('click', (): void => {
  const prevState = currentState

  type CityAction = { type: 'user/setCity'; payload: string }
  type AgeAction = { type: 'user/incrementAge' }
  type Action = CityAction | AgeAction

  const reducer = produce((draft: AppState, action: Action) => {
    switch (action.type) {
      case 'user/setCity':
        draft.user.company.address.city = action.payload
        break
      case 'user/incrementAge':
        draft.user.age++
        break
    }
  })

  let state = reducer(prevState, { type: 'user/setCity', payload: 'Санкт-Петербург' })
  state = reducer(state, { type: 'user/incrementAge' })

  consolePanel.warn('─── Immer как Reducer ───')
  consolePanel.log('Код:')
  consolePanel.log('  const reducer = produce((draft, action) => {')
  consolePanel.log('    switch (action.type) {')
  consolePanel.log('      case "user/setCity":')
  consolePanel.log('        draft.user.company.address.city = action.payload')
  consolePanel.log('        break')
  consolePanel.log('      case "user/incrementAge":')
  consolePanel.log('        draft.user.age++')
  consolePanel.log('        break')
  consolePanel.log('    }')
  consolePanel.log('  })')
  consolePanel.log('')
  consolePanel.log(`  city: "${prevState.user.company.address.city}" → "${state.user.company.address.city}"`)
  consolePanel.log(`  age:  ${prevState.user.age} → ${state.user.age}`)
  consolePanel.info('  Это ИМЕННО то, что делает createSlice в Redux Toolkit!')
  consolePanel.info('  produce(reducer) = иммутабельный reducer без spread-каскадов')
  consolePanel.log('')

  currentState = state
  render()
})

// ─── Reset ───

btnReset.addEventListener('click', (): void => {
  currentState = createInitialState()
  render()
  consolePanel.clear()
  consolePanel.info('Состояние сброшено')
  consolePanel.log('')
})
