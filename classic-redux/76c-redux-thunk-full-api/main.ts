import { legacy_createStore as createStore, applyMiddleware } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'
import { ConsolePanel } from '../shared/console-panel'

const con = new ConsolePanel(document.getElementById('console-container')!, 'redux-thunk паттерны')

interface AppState {
  users: string[]
  status: 'idle' | 'loading' | 'loaded' | 'error'
  error: string | null
  notification: string | null
  counter: number
}

const initialState: AppState = {
  users: [],
  status: 'idle',
  error: null,
  notification: null,
  counter: 0,
}

function reducer(state: AppState = initialState, action: any): AppState {
  switch (action.type) {
    case 'users/loading':
      return { ...state, status: 'loading', error: null }
    case 'users/loaded':
      return { ...state, status: 'loaded', users: action.payload }
    case 'users/error':
      return { ...state, status: 'error', error: action.payload }
    case 'ui/notification':
      return { ...state, notification: action.payload }
    case 'ui/clearNotification':
      return { ...state, notification: null }
    case 'counter/incremented':
      return { ...state, counter: state.counter + 1 }
    case 'analytics/track':
      return state
    case 'reset':
      return initialState
    default:
      return state
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

function fakeApi() {
  return {
    getUsers: async (): Promise<string[]> => {
      await sleep(800)
      return ['Алиса', 'Борис', 'Виктор', 'Галина']
    },
    saveUser: async (name: string): Promise<{ ok: boolean }> => {
      await sleep(500)
      if (name === 'error') throw new Error('Сервер недоступен')
      return { ok: true }
    },
  }
}

const api = fakeApi()

function createThunkMiddleware(extraArgument?: any) {
  return (storeAPI: any) => (next: any) => (action: any) => {
    if (typeof action === 'function') {
      return action(storeAPI.dispatch, storeAPI.getState, extraArgument)
    }
    return next(action)
  }
}

const thunkWithApi = createThunkMiddleware(api)

const store = createStore(reducer, applyMiddleware(thunkWithApi))

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

function render(): void {
  document.getElementById('state-display')!.textContent = JSON.stringify(store.getState(), null, 2)
}

store.subscribe(render)
render()

// ═══ Thunk action creators ═══

const fetchUsers = () => async (dispatch: any, _getState: any, api: ReturnType<typeof fakeApi>) => {
  dispatch({ type: 'users/loading' })
  const users = await api.getUsers()
  dispatch({ type: 'users/loaded', payload: users })
  return users
}

const fetchUsersWithParam = (prefix: string) => async (dispatch: any, _getState: any, api: ReturnType<typeof fakeApi>) => {
  dispatch({ type: 'users/loading' })
  const users = await api.getUsers()
  const filtered = users.filter(u => u.startsWith(prefix))
  dispatch({ type: 'users/loaded', payload: filtered })
  return filtered
}

const incrementIfOdd = () => (dispatch: any, getState: any) => {
  const { counter } = getState()
  if (counter % 2 === 0) {
    con.warn(`  counter = ${counter} (чётное) → пропускаем`)
    return false
  }
  con.success(`  counter = ${counter} (нечётное) → инкрементируем`)
  dispatch({ type: 'counter/incremented' })
  return true
}

const showNotification = (text: string) => (dispatch: any) => {
  dispatch({ type: 'ui/notification', payload: text })
  setTimeout(() => dispatch({ type: 'ui/clearNotification' }), 2000)
}

const logAnalytics = (event: string) => (dispatch: any) => {
  con.log(`  📊 Analytics: ${event}`)
  dispatch({ type: 'analytics/track', payload: event })
}

const loadAndNotify = () => async (dispatch: any) => {
  con.info('  1️⃣ Dispatch fetchUsers() — thunk вызывает thunk')
  const users = await dispatch(fetchUsers())
  con.info(`  2️⃣ Загружены: ${JSON.stringify(users)}`)

  con.info('  3️⃣ Dispatch showNotification() — ещё один thunk')
  dispatch(showNotification(`Загружено ${users.length} пользователей`))

  con.info('  4️⃣ Dispatch logAnalytics() — и ещё один thunk')
  dispatch(logAnalytics('users_loaded'))

  return users
}

// ═══ Button handlers ═══

document.getElementById('btn-simple')!.addEventListener('click', async () => {
  con.log('─── Простой thunk: fetchUsers() ───')
  con.log('  store.dispatch(fetchUsers())')
  const result = await store.dispatch(fetchUsers() as any)
  con.success(`  Результат: ${JSON.stringify(result)}`)
  con.log('')
})

document.getElementById('btn-with-params')!.addEventListener('click', async () => {
  con.log('─── Thunk с параметрами: fetchUsersWithParam("А") ───')
  con.log('  Внешняя функция получает "А", внутренний thunk использует для фильтрации')
  const result = await store.dispatch(fetchUsersWithParam('А') as any)
  con.success(`  Отфильтровано: ${JSON.stringify(result)}`)
  con.log('')
})

document.getElementById('btn-sync-thunk')!.addEventListener('click', () => {
  con.log('─── Синхронный thunk: incrementIfOdd() ───')
  store.dispatch({ type: 'counter/incremented' })
  const did = store.dispatch(incrementIfOdd() as any)
  con.log(`  Результат: ${did}`)
  con.log('')
})

document.getElementById('btn-compose')!.addEventListener('click', async () => {
  con.warn('─── Thunk вызывает thunk: loadAndNotify() ───')
  con.log('  Один thunk внутри dispatch\'ит три других thunk\'а')
  await store.dispatch(loadAndNotify() as any)
  con.success('  Вся цепочка завершена!')
  con.log('')
})

document.getElementById('btn-extra-arg')!.addEventListener('click', async () => {
  con.info('─── withExtraArgument: api как третий аргумент ───')
  con.log('  Thunk получает api объект через extraArgument')
  con.log('  Не нужен import — зависимость инъектируется через middleware')

  const thunk = async (_dispatch: any, _getState: any, injectedApi: any) => {
    con.log(`  api === injectedApi? ${api === injectedApi}`)
    con.log(`  api.getUsers: ${typeof injectedApi.getUsers}`)
    con.log(`  api.saveUser: ${typeof injectedApi.saveUser}`)
    const users = await injectedApi.getUsers()
    con.success(`  Вызвали api.getUsers(): ${JSON.stringify(users)}`)
    return users
  }

  await store.dispatch(thunk as any)
  con.log('')
})

document.getElementById('btn-return-promise')!.addEventListener('click', async () => {
  con.log('─── Thunk возвращает Promise ───')
  con.log('  const result = await store.dispatch(fetchUsers())')

  try {
    const result = await store.dispatch(fetchUsers() as any)
    con.success(`  ✔ await завершён, result: ${JSON.stringify(result)}`)
    con.success('  Можно выполнить код ПОСЛЕ завершения async операции')
  } catch (e: any) {
    con.error(`  ✖ Ошибка: ${e.message}`)
  }
  con.log('')
})

document.getElementById('btn-error-handling')!.addEventListener('click', async () => {
  con.error('─── Обработка ошибок в thunk ───')

  const failingThunk = () => async (dispatch: any, _getState: any, api: ReturnType<typeof fakeApi>) => {
    try {
      dispatch({ type: 'users/loading' })
      con.log('  Пытаемся сохранить пользователя "error" (вызовет ошибку)...')
      await api.saveUser('error')
      dispatch({ type: 'users/loaded', payload: [] })
    } catch (err: any) {
      con.error(`  ✖ Поймали ошибку: "${err.message}"`)
      dispatch({ type: 'users/error', payload: err.message })
      con.warn('  Dispatch users/error — UI покажет сообщение об ошибке')
    }
  }

  await store.dispatch(failingThunk() as any)
  con.log('')
})

document.getElementById('btn-reset')!.addEventListener('click', () => {
  store.dispatch({ type: 'reset' })
  con.clear()
  con.info('State сброшен')
})

con.info('Нажимайте кнопки, чтобы увидеть каждый паттерн в действии.')
con.log('Обратите внимание на DevTools — каждый thunk dispatch\'ит обычные actions.')
