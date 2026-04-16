import { legacy_createStore as createStore, applyMiddleware } from 'redux'
import { thunk } from 'redux-thunk'
import { DevToolsPanel } from '../shared/devtools-panel'
import { ConsolePanel } from '../shared/console-panel'

interface Item {
  id: number
  name: string
  color: string
}

interface NormalizedState {
  entities: Record<number, Item>
  ids: number[]
  nextId: number
}

interface AddAction {
  type: 'items/add'
  payload: Item
}

interface RemoveAction {
  type: 'items/removeLast'
}

type AppAction = AddAction | RemoveAction | { type: string }

const colors: string[] = [
  '#569cd6', '#4ec9b0', '#ce9178', '#dcdcaa',
  '#c586c0', '#6a9955', '#d7ba7d', '#79b8ff'
]

const names: string[] = [
  'Redux', 'React', 'TypeScript', 'Middleware',
  'Thunk', 'Selector', 'Reducer', 'Store',
  'Action', 'Dispatch', 'Subscribe', 'Compose'
]

const initialState: NormalizedState = {
  entities: {
    1: { id: 1, name: 'Redux', color: '#569cd6' },
    2: { id: 2, name: 'React', color: '#4ec9b0' }
  },
  ids: [1, 2],
  nextId: 3
}

function itemsReducer(state: NormalizedState = initialState, action: AppAction): NormalizedState {
  switch (action.type) {
    case 'items/add': {
      const item = (action as AddAction).payload
      return {
        ...state,
        entities: { ...state.entities, [item.id]: item },
        ids: [...state.ids, item.id],
        nextId: state.nextId + 1
      }
    }
    case 'items/removeLast': {
      if (state.ids.length === 0) return state
      const lastId = state.ids[state.ids.length - 1]
      const newEntities = { ...state.entities }
      delete newEntities[lastId]
      return {
        ...state,
        entities: newEntities,
        ids: state.ids.slice(0, -1)
      }
    }
    default:
      return state
  }
}

const store = createStore(itemsReducer, applyMiddleware(thunk as any))

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

const btnAdd = document.getElementById('btn-add')!
const btnRemove = document.getElementById('btn-remove')!
const entitiesDisplay = document.getElementById('entities-display')!
const idsDisplay = document.getElementById('ids-display')!
const stateDisplay = document.getElementById('state-display')!

function render(): void {
  const state = store.getState() as NormalizedState

  entitiesDisplay.textContent = JSON.stringify(state.entities, null, 2)
  idsDisplay.textContent = JSON.stringify(state.ids, null, 2)
  stateDisplay.textContent = JSON.stringify(state, null, 2)

  ;(btnRemove as HTMLButtonElement).disabled = state.ids.length === 0
}

store.subscribe(render)
render()

consolePanel.info('Нормализованная структура: entities + ids')
consolePanel.log('')
consolePanel.log('Начальное состояние:', 'color: #dcdcaa')
consolePanel.log('  entities: { 1: {...}, 2: {...} } — объект по ID', 'color: #4ec9b0')
consolePanel.log('  ids: [1, 2] — массив для порядка', 'color: #dcdcaa')
consolePanel.log('')

btnAdd.addEventListener('click', (): void => {
  const state = store.getState() as NormalizedState
  const id = state.nextId
  const name = names[(id - 1) % names.length]
  const color = colors[(id - 1) % colors.length]
  const item: Item = { id, name, color }

  consolePanel.log(`➕ Добавление: entities[${id}] = { name: "${name}" }`, 'color: #4caf50')
  consolePanel.log(`   ids: [...ids, ${id}]`, 'color: #4caf50')

  store.dispatch({ type: 'items/add', payload: item })

  const newState = store.getState() as NormalizedState
  consolePanel.log(`   entities: ${Object.keys(newState.entities).length} элементов, ids: [${newState.ids.join(', ')}]`, 'color: #9cdcfe')
  consolePanel.log('')
})

btnRemove.addEventListener('click', (): void => {
  const state = store.getState() as NormalizedState
  if (state.ids.length === 0) return

  const lastId = state.ids[state.ids.length - 1]
  const item = state.entities[lastId]

  consolePanel.log(`➖ Удаление: delete entities[${lastId}] ("${item.name}")`, 'color: #f44747')
  consolePanel.log(`   ids: ids.slice(0, -1)`, 'color: #f44747')

  store.dispatch({ type: 'items/removeLast' })

  const newState = store.getState() as NormalizedState
  consolePanel.log(`   entities: ${Object.keys(newState.entities).length} элементов, ids: [${newState.ids.join(', ')}]`, 'color: #9cdcfe')
  consolePanel.log('')
})
