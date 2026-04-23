import {
  addListener,
  configureStore,
  createAsyncThunk,
  createListenerMiddleware,
  createSlice,
  isAnyOf,
  type PayloadAction,
  type TypedStartListening,
  type TypedAddListener,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── 1) Slice: users ──────────────────────────────────────────────────
interface User { id: number; name: string }
interface Profile { id: number; fullName: string }
interface UsersState {
  user: User | null
  profile: Profile | null
  loading: boolean
  lastError: string | null
  runtimeListenerHits: number
}
const initial: UsersState = {
  user: null, profile: null, loading: false, lastError: null, runtimeListenerHits: 0,
}

// Thunk (для демонстрации — AppDispatch его примет без каста)
const fetchProfile = createAsyncThunk<Profile, number>(
  'users/fetchProfile',
  async (id) => {
    await new Promise((r) => setTimeout(r, 400))
    return { id, fullName: `User #${id}` }
  },
)

const usersSlice = createSlice({
  name: 'users',
  initialState: initial,
  reducers: {
    loggedIn: (s, a: PayloadAction<User>) => { s.user = a.payload },
    loggedOut: () => initial,
    runtimeHit: (s) => { s.runtimeListenerHits += 1 },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.pending, (s) => { s.loading = true; s.lastError = null })
      .addCase(fetchProfile.fulfilled, (s, a) => { s.loading = false; s.profile = a.payload })
      .addCase(fetchProfile.rejected, (s, a) => { s.loading = false; s.lastError = a.error.message ?? 'unknown' })
  },
})
const { loggedIn, loggedOut, runtimeHit } = usersSlice.actions

// ── 2) listener middleware + store ───────────────────────────────────
// В реальном проекте эти три куска лежат в трёх файлах (см. теорию),
// здесь в одном для наглядности — но порядок объявления тот же.

const listenerMiddleware = createListenerMiddleware()

const store = configureStore({
  reducer: { users: usersSlice.reducer },
  middleware: (g) => g().prepend(listenerMiddleware.middleware),
})

// ── 3) Typed helpers — withTypes<RootState, AppDispatch>() ──────────
type RootState = ReturnType<typeof store.getState>
type AppDispatch = typeof store.dispatch

type AppStartListening = TypedStartListening<RootState, AppDispatch>
type AppAddListener = TypedAddListener<RootState, AppDispatch>

const startAppListening = listenerMiddleware.startListening.withTypes<RootState, AppDispatch>() as AppStartListening
const addAppListener = addListener.withTypes<RootState, AppDispatch>() as AppAddListener

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог typed listener + thunk')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

// ── 4) Pre-typed listener: на loggedIn → dispatch(thunk) ─────────────
startAppListening({
  actionCreator: loggedIn,
  effect: async (action, api) => {
    // api.getState() здесь уже RootState — без каста
    const state = api.getState()
    con.log(`[typed] getState().users.user = ${JSON.stringify(state.users.user)}`)

    // api.dispatch — AppDispatch; thunk'и принимаются из коробки
    const result = await api.dispatch(fetchProfile(action.payload.id))

    // result.type — "users/fetchProfile/fulfilled" | ".rejected"
    if (fetchProfile.fulfilled.match(result)) {
      con.success(`[typed] thunk fulfilled — profile=${JSON.stringify(result.payload)}`)
    } else {
      con.error(`[typed] thunk rejected: ${result.error.message}`)
    }
  },
})

// Второй pre-typed listener — matcher-форма
startAppListening({
  matcher: isAnyOf(loggedIn, loggedOut),
  effect: (action, api) => {
    const s = api.getState()
    con.info(`[typed:matcher] action=${action.type} · user=${s.users.user?.name ?? 'null'}`)
  },
})

// ── 5) Runtime-добавление через dispatch(addAppListener(...)) ────────
// addAppListener вернёт action; store.dispatch(action) вернёт unsubscribe.
document.getElementById('runtime')!.addEventListener('click', () => {
  con.info('[runtime] добавляю listener через dispatch(addAppListener(...))')
  const unsub = store.dispatch(addAppListener({
    actionCreator: loggedIn,
    effect: (_action, api) => {
      // snapshot через api.getState() — RootState
      api.dispatch(runtimeHit())
      const hits = api.getState().users.runtimeListenerHits
      con.log(`[runtime] hit #${hits}`)
    },
  }))
  // unsub — UnsubscribeListener
  setTimeout(() => {
    (unsub as () => void)()
    con.warn('[runtime] через 5с runtime-listener отключён')
  }, 5000)
})

// ── render ───────────────────────────────────────────────────────────
const stateOut = document.getElementById('state-out')!
function render(): void {
  stateOut.textContent = JSON.stringify(store.getState().users, null, 2)
}
render()
store.subscribe(render)

// ── buttons ──────────────────────────────────────────────────────────
let nextId = 1
document.getElementById('login')!.addEventListener('click', () => {
  const a = loggedIn({ id: nextId, name: `user${nextId}` })
  nextId += 1
  store.dispatch(a)
  con.action(a)
})

document.getElementById('reset')!.addEventListener('click', () => {
  const a = loggedOut(); store.dispatch(a); con.action(a)
})

con.log('Login — сработают два typed listener\'а, запустится thunk fetchProfile; типы везде правильные.')
con.info('Runtime-listener — dispatch(addAppListener(...)) добавит ещё один подписчик; через 5с он отпишется.')
con.warn('Обратите внимание: ни одного as RootState / as AppDispatch в listener\'ах.')
