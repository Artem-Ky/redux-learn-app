import { legacy_createStore as createStore, applyMiddleware } from 'redux'
import { thunk } from 'redux-thunk'
import { ConsolePanel } from '../shared/console-panel'

interface SearchState {
  query: string
  results: string[]
}

interface QueryChangedAction {
  type: 'search/queryChanged'
  payload: string
}

interface ResultsLoadedAction {
  type: 'search/resultsLoaded'
  payload: string[]
}

type SearchAction = QueryChangedAction | ResultsLoadedAction | { type: string }

const allItems: string[] = [
  'Redux Toolkit',
  'Redux Thunk',
  'Redux Saga',
  'React Redux',
  'Redux DevTools',
  'Redux Middleware',
  'Redux Store',
  'Redux Reducer',
  'Redux Action',
  'Redux Selector',
  'Redux combineReducers',
  'Redux applyMiddleware',
  'Redux createStore',
  'Redux dispatch',
  'Redux subscribe'
]

const initialState: SearchState = {
  query: '',
  results: []
}

function searchReducer(state: SearchState = initialState, action: SearchAction): SearchState {
  switch (action.type) {
    case 'search/queryChanged':
      return { ...state, query: (action as QueryChangedAction).payload }
    case 'search/resultsLoaded':
      return { ...state, results: (action as ResultsLoadedAction).payload }
    default:
      return state
  }
}

let blockedCount = 0

const debounceMiddleware = (store: any) => {
  let timer: ReturnType<typeof setTimeout> | null = null

  return (next: any) => (action: any): void => {
    if (action.type === 'search/queryChanged') {
      if (timer) {
        clearTimeout(timer)
        blockedCount++
        consolePanel.log(
          `⛔ BLOCKED: "${action.payload}" (ещё печатает... blocked: ${blockedCount})`,
          'color: #f44747'
        )
      }

      timer = setTimeout(() => {
        timer = null
        consolePanel.log(
          `✅ DISPATCHED: "${action.payload}" (прошёл после 400 мс паузы)`,
          'color: #4caf50'
        )
        next(action)

        const q = action.payload.toLowerCase()
        const filtered = q
          ? allItems.filter((item: string) => item.toLowerCase().includes(q))
          : []
        store.dispatch({ type: 'search/resultsLoaded', payload: filtered })
      }, 400)
      return
    }
    return next(action)
  }
}

const store = createStore(
  searchReducer,
  applyMiddleware(debounceMiddleware as any, thunk as any)
)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

const searchInput = document.getElementById('search-input') as HTMLInputElement
const queryDisplay = document.getElementById('query-display')!
const resultsDisplay = document.getElementById('results-display')!

function render(): void {
  const state = store.getState() as SearchState

  queryDisplay.textContent = `"${state.query}"`

  if (!state.query) {
    resultsDisplay.innerHTML = `
      <span style="color: var(--text-muted); font-size: 0.85rem;">Введите запрос ↑</span>`
    return
  }

  if (state.results.length === 0) {
    resultsDisplay.innerHTML = `
      <span style="color: var(--accent-orange); font-size: 0.85rem;">Ничего не найдено для "${state.query}"</span>`
    return
  }

  resultsDisplay.innerHTML = state.results.map((item: string) => `
    <div style="padding: 6px 10px; border-bottom: 1px solid var(--border); font-size: 0.85rem; color: var(--text-bright);">
      ${item.replace(
        new RegExp(`(${state.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
        '<span style="color: var(--accent-cyan); font-weight: 600;">$1</span>'
      )}
    </div>
  `).join('')
}

store.subscribe(render)
render()

consolePanel.info('Debounce Middleware — задержка 400 мс')
consolePanel.info('Быстро печатайте — промежуточные вводы будут заблокированы')
consolePanel.log('')

searchInput.addEventListener('input', (): void => {
  const value = searchInput.value
  consolePanel.log(`⌨️  dispatch({ type: "search/queryChanged", payload: "${value}" })`, 'color: #dcdcaa')
  store.dispatch({ type: 'search/queryChanged', payload: value })
})
