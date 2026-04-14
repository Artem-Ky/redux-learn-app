import { legacy_createStore as createStore } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'

interface FiltersState {
  selectedColors: string[]
}

interface ColorFilterPayload {
  color: string
  changeType: string
}

interface ColorFilterAction {
  type: string
  payload: ColorFilterPayload
}

const initialState: FiltersState = {
  selectedColors: []
}

function colorFilterChanged(color: string, changeType: string): ColorFilterAction {
  return {
    type: 'filters/colorFilterChanged',
    payload: { color, changeType }
  }
}

function filtersReducer(
  state: FiltersState = initialState,
  action: ColorFilterAction
): FiltersState {
  switch (action.type) {
    case 'filters/colorFilterChanged': {
      const { color, changeType } = action.payload
      if (changeType === 'added') {
        if (state.selectedColors.includes(color)) return state
        return { ...state, selectedColors: [...state.selectedColors, color] }
      } else {
        return {
          ...state,
          selectedColors: state.selectedColors.filter(c => c !== color)
        }
      }
    }
    default:
      return state
  }
}

const store = createStore(filtersReducer)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const COLOR_DISPLAY: Record<string, string> = {
  red: '🔴 Red',
  blue: '🔵 Blue',
  green: '🟢 Green'
}

function render(): void {
  const state = store.getState()
  document.getElementById('state-display')!.textContent = JSON.stringify(state, null, 2)

  const filtersEl = document.getElementById('active-filters')!
  if (state.selectedColors.length === 0) {
    filtersEl.textContent = 'Нет активных фильтров'
  } else {
    filtersEl.innerHTML = state.selectedColors
      .map(c => `<span style="display: inline-block; padding: 2px 8px; margin: 2px; border-radius: 4px; background: rgba(255,255,255,0.1); font-size: 0.8rem;">${COLOR_DISPLAY[c] || c}</span>`)
      .join('')
  }
}

function showAction(action: ColorFilterAction): void {
  document.getElementById('action-display')!.textContent = JSON.stringify(action, null, 2)
}

store.subscribe(render)
render()

document.querySelectorAll<HTMLButtonElement>('[data-color]').forEach(btn => {
  btn.addEventListener('click', (): void => {
    const color = btn.dataset.color!
    const changeType = btn.dataset.change!
    const action = colorFilterChanged(color, changeType)
    showAction(action)
    store.dispatch(action)
  })
})
