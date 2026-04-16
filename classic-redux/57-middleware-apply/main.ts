import { legacy_createStore as createStore, applyMiddleware } from 'redux'
import { ConsolePanel } from '../shared/console-panel'

interface AppState {
  count: number
}

interface AppAction {
  type: string
}

const initialState: AppState = { count: 0 }

function rootReducer(state: AppState = initialState, action: AppAction): AppState {
  switch (action.type) {
    case 'increment':
      return { count: state.count + 1 }
    default:
      return state
  }
}

const con = new ConsolePanel(document.getElementById('console-container')!, 'Порядок выполнения middleware')

const print1: (storeAPI: any) => (next: any) => (action: any) => any =
  (_storeAPI: any) => (next: any) => (action: any) => {
    con.log('  1️⃣  print1 — вызван ПЕРВЫМ')
    return next(action)
  }

const print2: (storeAPI: any) => (next: any) => (action: any) => any =
  (_storeAPI: any) => (next: any) => (action: any) => {
    con.log('  2️⃣  print2 — вызван ВТОРЫМ')
    return next(action)
  }

const print3: (storeAPI: any) => (next: any) => (action: any) => any =
  (_storeAPI: any) => (next: any) => (action: any) => {
    con.log('  3️⃣  print3 — вызван ТРЕТЬИМ')
    return next(action)
  }

const store = createStore(
  rootReducer,
  applyMiddleware(print1, print2, print3)
)

function render(): void {
  const state = store.getState()
  document.getElementById('state-display')!.textContent = JSON.stringify(state, null, 2)
}

store.subscribe(render)
render()

let dispatchCount = 0

document.getElementById('btn-dispatch')!.addEventListener('click', (): void => {
  dispatchCount++
  con.info(`─── Dispatch #${dispatchCount}: { type: "increment" } ───`)
  store.dispatch({ type: 'increment' })
  con.success('  ✔ Reducer обработал → state: ' + JSON.stringify(store.getState()))
  con.log('')
})

document.getElementById('btn-clear')!.addEventListener('click', (): void => {
  con.clear()
  con.info('Лог очищен. Нажмите «Dispatch Action» снова.')
})

con.info('applyMiddleware(print1, print2, print3)')
con.log('Middleware выполняются в порядке: print1 → print2 → print3 → reducer')
con.log('Нажмите кнопку, чтобы проверить порядок')
