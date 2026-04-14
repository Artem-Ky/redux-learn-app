import { legacy_createStore as createStore } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'

interface ProfileState {
  name: string
  age: number
  email: string
  city: string
}

interface ProfileAction {
  type: string
  payload?: string | number
}

const initialState: ProfileState = {
  name: 'Иван',
  age: 28,
  email: 'ivan@example.com',
  city: 'Москва',
}

function profileReducer(
  state: ProfileState = initialState,
  action: ProfileAction
): ProfileState {
  switch (action.type) {
    case 'profile/nameChanged':
      return { ...state, name: action.payload as string }
    case 'profile/ageIncremented':
      return { ...state, age: state.age + 1 }
    case 'profile/emailChanged':
      return { ...state, email: action.payload as string }
    case 'profile/cityChanged':
      return { ...state, city: action.payload as string }
    case 'profile/reset':
      return { ...initialState }
    default:
      return state
  }
}

const store = createStore(profileReducer)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

function render(): void {
  const state = store.getState()
  document.getElementById('state-display')!.textContent = JSON.stringify(state, null, 2)
}

function showRefChange(before: ProfileState, after: ProfileState): void {
  const el = document.getElementById('ref-display')!
  const changed = before !== after
  if (changed) {
    el.textContent = `✔ Да: oldState !== newState → ${changed}\nRedux обнаружит изменение и обновит UI`
    el.style.color = 'var(--success)'
  } else {
    el.textContent = `✖ Нет: oldState !== newState → ${changed}\nRedux НЕ увидит изменение`
    el.style.color = 'var(--error)'
  }
}

store.subscribe(render)
render()

document.getElementById('btn-name')!.addEventListener('click', (): void => {
  const before = store.getState()
  store.dispatch({ type: 'profile/nameChanged', payload: 'Алексей' })
  showRefChange(before, store.getState())
})

document.getElementById('btn-age')!.addEventListener('click', (): void => {
  const before = store.getState()
  store.dispatch({ type: 'profile/ageIncremented' })
  showRefChange(before, store.getState())
})

document.getElementById('btn-email')!.addEventListener('click', (): void => {
  const before = store.getState()
  store.dispatch({ type: 'profile/emailChanged', payload: 'alex@dev.io' })
  showRefChange(before, store.getState())
})

document.getElementById('btn-city')!.addEventListener('click', (): void => {
  const before = store.getState()
  store.dispatch({ type: 'profile/cityChanged', payload: 'Новосибирск' })
  showRefChange(before, store.getState())
})

document.getElementById('btn-reset')!.addEventListener('click', (): void => {
  const before = store.getState()
  store.dispatch({ type: 'profile/reset' })
  showRefChange(before, store.getState())
})
