import { legacy_createStore as createStore } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'

type ShoppingState = string[]

interface ShoppingAction {
  type: string
  payload?: string | number
}

const initialState: ShoppingState = ['Молоко', 'Яйца', 'Сахар']

function shoppingReducer(
  state: ShoppingState = initialState,
  action: ShoppingAction
): ShoppingState {
  switch (action.type) {
    case 'list/itemAdded':
      return [...state, action.payload as string]
    case 'list/firstRemoved':
      return state.filter((_, i) => i !== 0)
    case 'list/lastRemoved':
      return state.filter((_, i) => i !== state.length - 1)
    case 'list/firstUppercased':
      return state.map((item, i) =>
        i === 0 ? item.toUpperCase() : item
      )
    case 'list/allMarkedDone':
      return state.map(item =>
        item.startsWith('✔ ') ? item : `✔ ${item}`
      )
    case 'list/reset':
      return [...initialState]
    default:
      return state
  }
}

const store = createStore(shoppingReducer)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

function render(): void {
  const state = store.getState()
  document.getElementById('state-display')!.textContent = JSON.stringify(state, null, 2)

  const listEl = document.getElementById('list-display')!
  if (state.length === 0) {
    listEl.innerHTML = '<em style="color: var(--text-muted);">Список пуст</em>'
  } else {
    listEl.innerHTML = state
      .map((item, i) =>
        `<div style="padding: 4px 0; border-bottom: 1px solid var(--border);">
          <span style="color: var(--text-muted); font-size: 0.75rem; margin-right: 8px;">${i}.</span>
          ${item}
        </div>`
      )
      .join('')
  }
}

store.subscribe(render)
render()

document.getElementById('btn-add')!.addEventListener('click', (): void => {
  const input = document.getElementById('input-add') as HTMLInputElement
  const text = input.value.trim()
  if (text) {
    store.dispatch({ type: 'list/itemAdded', payload: text })
    input.value = ''
  }
})

document.getElementById('input-add')!.addEventListener('keydown', (e: KeyboardEvent): void => {
  if (e.key === 'Enter') {
    document.getElementById('btn-add')!.click()
  }
})

document.getElementById('btn-remove-first')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'list/firstRemoved' })
})

document.getElementById('btn-remove-last')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'list/lastRemoved' })
})

document.getElementById('btn-upper-first')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'list/firstUppercased' })
})

document.getElementById('btn-mark-done')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'list/allMarkedDone' })
})

document.getElementById('btn-reset')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'list/reset' })
})
