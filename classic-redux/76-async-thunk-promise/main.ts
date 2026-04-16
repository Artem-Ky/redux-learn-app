import { legacy_createStore as createStore, applyMiddleware } from 'redux'
import { thunk } from 'redux-thunk'
import { DevToolsPanel } from '../shared/devtools-panel'
import { ConsolePanel } from '../shared/console-panel'

interface SavedItem {
  id: number
  name: string
  savedAt: string
}

interface AppState {
  status: 'idle' | 'saving' | 'saved'
  items: SavedItem[]
}

interface SavePendingAction {
  type: 'save/pending'
}

interface SaveFulfilledAction {
  type: 'save/fulfilled'
  payload: SavedItem
}

interface SaveResetAction {
  type: 'save/reset'
}

type AppAction = SavePendingAction | SaveFulfilledAction | SaveResetAction | { type: string }

const initialState: AppState = {
  status: 'idle',
  items: []
}

function saveReducer(state: AppState = initialState, action: AppAction): AppState {
  switch (action.type) {
    case 'save/pending':
      return { ...state, status: 'saving' }
    case 'save/fulfilled':
      return {
        ...state,
        status: 'saved',
        items: [...state.items, (action as SaveFulfilledAction).payload]
      }
    case 'save/reset':
      return { ...state, status: 'idle' }
    default:
      return state
  }
}

const store = createStore(saveReducer, applyMiddleware(thunk))

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

const inputName = document.getElementById('input-name') as HTMLInputElement
const btnSave = document.getElementById('btn-save')!
const statusDisplay = document.getElementById('status-display')!
const toastEl = document.getElementById('toast')!
const itemsDisplay = document.getElementById('items-display')!
const stateDisplay = document.getElementById('state-display')!

let nextId = 1

function fakeApiSave(name: string): Promise<SavedItem> {
  return new Promise<SavedItem>((resolve) => {
    setTimeout(() => {
      resolve({
        id: nextId++,
        name,
        savedAt: new Date().toLocaleTimeString('ru-RU', { hour12: false })
      })
    }, 1200)
  })
}

const saveItem = (name: string) => {
  return async (dispatch: any): Promise<void> => {
    consolePanel.log('thunk: dispatch({ type: "save/pending" })', 'color: #c586c0')
    dispatch({ type: 'save/pending' })

    consolePanel.log('thunk: ⏳ имитация API-сохранения (1.2 сек)...', 'color: #dcdcaa')
    const savedItem = await fakeApiSave(name)

    consolePanel.log('thunk: API ответил — элемент сохранён', 'color: #4caf50')
    dispatch({ type: 'save/fulfilled', payload: savedItem })
    consolePanel.log('thunk: dispatch({ type: "save/fulfilled" })', 'color: #4caf50')
    consolePanel.log('thunk: Promise resolved — управление возвращается вызывающему коду', 'color: #569cd6')
  }
}

function showToast(): void {
  toastEl.style.display = 'block'
  setTimeout((): void => {
    toastEl.style.display = 'none'
    store.dispatch({ type: 'save/reset' })
  }, 2000)
}

function render(): void {
  const state = store.getState() as AppState

  statusDisplay.textContent = state.status
  statusDisplay.style.color =
    state.status === 'saving' ? 'var(--accent-orange)' :
    state.status === 'saved' ? 'var(--accent-green)' :
    'var(--text-secondary)'

  if (state.items.length > 0) {
    itemsDisplay.innerHTML = state.items.map((item: SavedItem) => `
      <div style="display: flex; gap: 12px; padding: 6px 8px; border-bottom: 1px solid var(--border); font-size: 0.85rem;">
        <span style="color: var(--accent); font-family: var(--font-mono);">#${item.id}</span>
        <span style="color: var(--text-bright); flex: 1;">${item.name}</span>
        <span style="color: var(--text-muted);">${item.savedAt}</span>
      </div>
    `).join('')
  } else {
    itemsDisplay.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">Пока ничего не сохранено</span>'
  }

  stateDisplay.textContent = JSON.stringify(state, null, 2)

  btnSave.textContent = state.status === 'saving' ? '⏳ Сохранение...' : '💾 Save'
  ;(btnSave as HTMLButtonElement).disabled = state.status === 'saving'
}

store.subscribe(render)
render()

consolePanel.info('dispatch(thunk()) возвращает Promise → можно await')

btnSave.addEventListener('click', async (): Promise<void> => {
  const name = inputName.value.trim()
  if (!name) {
    consolePanel.warn('Введите имя элемента')
    return
  }

  consolePanel.log('──── await store.dispatch(saveItem("' + name + '")) ────')
  consolePanel.log('UI: ожидание завершения Promise...', 'color: #dcdcaa')

  await store.dispatch(saveItem(name) as any)

  consolePanel.success('UI: Promise resolved! Показываем toast "Saved!"')
  showToast()

  inputName.value = ''
  consolePanel.log('')
})
