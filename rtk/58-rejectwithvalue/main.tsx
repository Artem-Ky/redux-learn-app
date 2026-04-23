import { configureStore, createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface User { id: number; email: string }
interface LoginError { code: number; message: string; hint?: string }

type Mode = 'ok' | 'throw' | 'rejectWithValue'

function fakeLogin(mode: Mode): Promise<User> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (mode === 'ok') resolve({ id: 42, email: 'user@example.com' })
      else reject(new Error('HTTP 401 Unauthorized (raw error)'))
    }, 400)
  })
}

// Пометили ThunkApiConfig.rejectValue — action.payload типизирован
const login = createAsyncThunk<
  User,
  Mode,
  { rejectValue: LoginError }
>(
  'auth/login',
  async (mode, { rejectWithValue }) => {
    try {
      return await fakeLogin(mode)
    } catch (err) {
      if (mode === 'rejectWithValue') {
        // ключевое: return (не throw)
        return rejectWithValue({
          code: 401,
          message: 'Bad password',
          hint: 'Попробуйте пароль password123',
        })
      }
      // mode === 'throw' — пробрасываем дальше (RTK поймает и сделает error-сериализацию)
      throw err
    }
  },
)

interface AuthState {
  user: User | null
  loading: boolean
  // payload от rejectWithValue (типизирован)
  errPayload: LoginError | null
  // error от обычной ошибки (SerializedError)
  errRaw: { name?: string; message?: string; code?: string } | null
  rejectedWithValue: boolean
  lastRejectedAction: unknown
}

const initialState: AuthState = {
  user: null,
  loading: false,
  errPayload: null,
  errRaw: null,
  rejectedWithValue: false,
  lastRejectedAction: null,
}

const auth = createSlice({
  name: 'auth',
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(login.pending, (s) => {
      s.loading = true
      s.errPayload = null
      s.errRaw = null
      s.rejectedWithValue = false
      s.lastRejectedAction = null
    })
    b.addCase(login.fulfilled, (s, a) => {
      s.loading = false
      s.user = a.payload
    })
    b.addCase(login.rejected, (s, a) => {
      s.loading = false
      // Тут работает полное различение:
      s.rejectedWithValue = a.meta.rejectedWithValue
      s.errPayload = a.payload ?? null  // ← тип: LoginError | null (благодаря rejectValue)
      s.errRaw    = a.error ?? null
      s.lastRejectedAction = { type: a.type, payload: a.payload, error: a.error, meta: a.meta }
    })
  },
})

const store = configureStore({ reducer: auth.reducer })

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог rejectWithValue')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const stateOut       = document.getElementById('state-out')!
const lastRejectedEl = document.getElementById('last-rejected')!

function render(): void {
  const s = store.getState()
  stateOut.textContent = JSON.stringify(s, null, 2)
  lastRejectedEl.textContent = s.lastRejectedAction
    ? JSON.stringify(s.lastRejectedAction, null, 2)
    : '— ещё не было rejected —'
}
render()
store.subscribe(render)

// Лог dispatch
const origDispatch = store.dispatch
;(store as { dispatch: typeof origDispatch }).dispatch = ((a: unknown) => {
  const res = origDispatch(a as Parameters<typeof origDispatch>[0])
  if (typeof a !== 'function') {
    const action = a as { type?: string; payload?: unknown }
    if (action.type) con.action({ type: action.type, payload: action.payload })
  }
  return res
}) as typeof origDispatch

document.getElementById('login-ok')!.addEventListener('click', () => {
  con.log('>>> dispatch(login("ok"))')
  store.dispatch(login('ok'))
})

document.getElementById('login-throw')!.addEventListener('click', () => {
  con.log('>>> dispatch(login("throw")) — обычный throw new Error')
  store.dispatch(login('throw')).then((res) => {
    if (login.rejected.match(res)) {
      con.warn(`payload = ${JSON.stringify(res.payload)}  (undefined — т.к. throw, а не rejectWithValue)`)
      con.warn(`error   = ${JSON.stringify(res.error)}    (SerializedError — с полями name/message/stack)`)
      con.info(`meta.rejectedWithValue = ${res.meta.rejectedWithValue}`)
    }
  })
})

document.getElementById('login-rwv')!.addEventListener('click', () => {
  con.log('>>> dispatch(login("rejectWithValue"))')
  store.dispatch(login('rejectWithValue')).then((res) => {
    if (login.rejected.match(res)) {
      con.success(`payload = ${JSON.stringify(res.payload)}  (типизирован как LoginError)`)
      con.warn(`error   = ${JSON.stringify(res.error)}    (всегда { message: 'Rejected' } для rwv)`)
      con.info(`meta.rejectedWithValue = ${res.meta.rejectedWithValue}`)
    }
  })
})

document.getElementById('login-unwrap')!.addEventListener('click', async () => {
  con.log('>>> await dispatch(login("rejectWithValue")).unwrap()')
  try {
    const user = await store.dispatch(login('rejectWithValue')).unwrap()
    con.success(`unwrap вернул: ${JSON.stringify(user)}`)
  } catch (e) {
    con.error(`unwrap() бросил: ${JSON.stringify(e)}`)
    con.info('(для rejectWithValue unwrap бросает action.payload, для throw — action.error)')
  }
})

con.log('3 кнопки демонстрируют 3 исхода thunk:')
con.log('  "Login OK"          → fulfilled, payload = User')
con.log('  "throw Error"        → rejected, payload = undefined, error = SerializedError')
con.log('  "rejectWithValue"    → rejected, payload = LoginError, error = { message: "Rejected" }')
con.success('Смотрите блок "Последний rejected action" справа — там action.payload vs action.error бок-о-бок.')
