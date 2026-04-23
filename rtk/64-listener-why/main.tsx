import {
  configureStore,
  createListenerMiddleware,
  createSlice,
  type PayloadAction,
  type TypedStartListening,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface User { id: string; name: string; token: string }
interface Profile { id: string; fullName: string; avatar: string }
interface AuthState {
  user: User | null
  profile: Profile | null
  ws: 'off' | 'connecting' | 'on'
  analyticsSent: number
}

const initial: AuthState = { user: null, profile: null, ws: 'off', analyticsSent: 0 }

const authSlice = createSlice({
  name: 'auth',
  initialState: initial,
  reducers: {
    loginSuccess: (s, a: PayloadAction<User>) => { s.user = a.payload; s.ws = 'connecting' },
    profileLoaded: (s, a: PayloadAction<Profile>) => { s.profile = a.payload },
    wsConnected: (s) => { s.ws = 'on' },
    analyticsTracked: (s) => { s.analyticsSent += 1 },
    logout: () => initial,
    reset: () => initial,
  },
})

const { loginSuccess, profileLoaded, wsConnected, analyticsTracked, logout, reset } = authSlice.actions

// ── listenerMiddleware ───────────────────────────────────────────────
const listenerMiddleware = createListenerMiddleware()
type RootState = { auth: AuthState }
type AppDispatch = typeof store.dispatch
type AppStartListening = TypedStartListening<RootState, AppDispatch>
const startAppListening = listenerMiddleware.startListening as AppStartListening

// ── store ────────────────────────────────────────────────────────────
const store = configureStore({
  reducer: { auth: authSlice.reducer },
  middleware: (getDefault) => getDefault().prepend(listenerMiddleware.middleware),
})

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог фаз: loginSuccess → три побочки')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

// ── Реакция на loginSuccess (takeLatest) ─────────────────────────────
startAppListening({
  actionCreator: loginSuccess,
  effect: async (action, api) => {
    api.cancelActiveListeners() // takeLatest: ранние инстансы отменяются
    con.info(`[listener] loginSuccess user=${action.payload.name}`)

    // Параллельные форки
    const profileTask = api.fork(async (forkApi) => {
      con.log('[fork] fetchProfile start')
      await forkApi.delay(400)
      forkApi.signal.throwIfAborted()
      return {
        id: action.payload.id,
        fullName: action.payload.name.toUpperCase(),
        avatar: `/av/${action.payload.id}.png`,
      } satisfies Profile
    })

    const wsTask = api.fork(async (forkApi) => {
      con.log('[fork] ws connect start')
      await forkApi.delay(300)
      return 'ok'
    })

    // Синхронный dispatch аналитики
    api.dispatch(analyticsTracked())
    con.success('[effect] analytics tracked (sync)')

    const pRes = await profileTask.result
    if (pRes.status === 'ok') {
      api.dispatch(profileLoaded(pRes.value))
      con.success('[effect] profileLoaded')
    } else {
      con.warn(`[effect] profile task ${pRes.status}`)
    }

    const wRes = await wsTask.result
    if (wRes.status === 'ok') {
      api.dispatch(wsConnected())
      con.success('[effect] ws connected')
    }
  },
})

// ── render ───────────────────────────────────────────────────────────
const stateOut = document.getElementById('state-out')!
function render(): void {
  stateOut.textContent = JSON.stringify(store.getState().auth, null, 2)
}
render()
store.subscribe(render)

// ── buttons ──────────────────────────────────────────────────────────
document.getElementById('login')!.addEventListener('click', () => {
  const user: User = { id: 'u1', name: 'toad505', token: 'abc.def.ghi' }
  const a = loginSuccess(user)
  store.dispatch(a)
  con.action(a)
})

document.getElementById('logout')!.addEventListener('click', () => {
  const a = logout()
  store.dispatch(a)
  con.action(a)
})

document.getElementById('reset')!.addEventListener('click', () => {
  const a = reset()
  store.dispatch(a)
  con.action(a)
})

// ── Tabs ─────────────────────────────────────────────────────────────
document.querySelectorAll<HTMLButtonElement>('.impl-tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.tab!
    document.querySelectorAll('.impl-tab').forEach((b) => b.classList.remove('active'))
    btn.classList.add('active')
    document.querySelectorAll<HTMLElement>('.impl-panel').forEach((p) => {
      p.classList.toggle('active', p.dataset.panel === key)
    })
  })
})

con.log('Нажмите «Login» — listener подхватит loginSuccess и запустит три эффекта.')
con.info('cancelActiveListeners() делает поведение takeLatest — повторный login отменит предыдущий запуск.')
