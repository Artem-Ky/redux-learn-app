import { legacy_createStore as createStore, applyMiddleware } from 'redux'
import { ConsolePanel } from '../shared/console-panel'

interface AppState {
  value: number
}

interface AppAction {
  type: string
}

const initialState: AppState = { value: 0 }

function rootReducer(state: AppState = initialState, action: AppAction): AppState {
  switch (action.type) {
    case 'increment':
      return { value: state.value + 1 }
    default:
      return state
  }
}

const con = new ConsolePanel(document.getElementById('console-container')!, 'Иерархия вызовов middleware')

function exampleMiddleware(storeAPI: any): (next: any) => (action: any) => any {
  con.log('🟣 exampleMiddleware(storeAPI) — ВЫЗВАНА (1 раз при создании store)')
  con.log('   storeAPI содержит: { dispatch, getState }')

  return function wrapDispatch(next: any): (action: any) => any {
    con.log('🟠 wrapDispatch(next) — ВЫЗВАНА (1 раз при настройке цепочки)')
    con.log('   next = dispatch следующего middleware (или настоящий dispatch)')

    return function handleAction(action: any): any {
      con.info('🔵 handleAction(action) — ВЫЗВАНА при dispatch!')
      con.log('   action = ' + JSON.stringify(action))
      con.log('   state до: ' + JSON.stringify(storeAPI.getState()))
      const result = next(action)
      con.log('   state после: ' + JSON.stringify(storeAPI.getState()))
      return result
    }
  }
}

con.info('═══ Создаём store с exampleMiddleware ═══')
con.log('')

const store = createStore(
  rootReducer,
  applyMiddleware(exampleMiddleware)
)

con.log('')
con.success('✔ Store создан! Внешние функции (storeAPI, next) уже вызваны.')
con.log('Теперь при каждом dispatch будет вызываться только handleAction(action)')
con.log('─'.repeat(50))
con.log('')

let dispatchCount = 0

function doDispatch(): void {
  dispatchCount++
  con.info(`─── Dispatch #${dispatchCount} ───`)
  store.dispatch({ type: 'increment' })
  con.log('')
}

document.getElementById('btn-dispatch')!.addEventListener('click', doDispatch)
document.getElementById('btn-dispatch-again')!.addEventListener('click', doDispatch)

document.getElementById('btn-clear')!.addEventListener('click', (): void => {
  con.clear()
  con.info('Лог очищен.')
  con.log('Обратите внимание: exampleMiddleware(storeAPI) и wrapDispatch(next) НЕ вызываются заново!')
  con.log('Только handleAction(action) вызывается при каждом dispatch.')
  con.log('')
})
