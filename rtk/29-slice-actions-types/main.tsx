import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface User { name: string }
interface AuthState { user: User | null; loading: boolean; error: string | null }

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, loading: false, error: null } as AuthState,
  reducers: {
    loginRequest: (state) => { state.loading = true; state.error = null },
    loginSuccess: (state, action: PayloadAction<User>) => {
      state.loading = false
      state.user = action.payload
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.loading = false
      state.error = action.payload
    },
    logout: (state) => { state.user = null },
  },
})

const { loginRequest, loginSuccess, loginFailure, logout } = authSlice.actions

const store = configureStore({ reducer: { auth: authSlice.reducer } })

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог auth slice')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const tableBody = document.getElementById('gen-table-body')!
const lastOut = document.getElementById('last-out')!

const rows = Object.keys(authSlice.actions).map((key) => {
  const ac = (authSlice.actions as Record<string, { type: string }>)[key]
  return `<tr>
    <td>${key}</td>
    <td>"${ac.type}"</td>
    <td>auth.actions.${key}()</td>
  </tr>`
})
tableBody.innerHTML = rows.join('')

const ACTS: Record<string, () => { type: string; payload?: unknown }> = {
  loginRequest: () => loginRequest(),
  loginSuccess: () => loginSuccess({ name: 'Alice' }),
  loginFailure: () => loginFailure('401 Unauthorized'),
  logout:       () => logout(),
}

document.querySelectorAll<HTMLButtonElement>('[data-do]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const a = ACTS[btn.dataset.do!]()
    store.dispatch(a)
    con.action(a)

    const matchResults: string[] = []
    Object.entries(authSlice.actions).forEach(([key, creator]) => {
      const matched = (creator as { match: (a: unknown) => boolean }).match(a)
      if (matched) matchResults.push(`✓ auth.actions.${key}.match(action) = true`)
    })

    lastOut.textContent =
`action = ${JSON.stringify(a, null, 2)}

typeof action.type = "${typeof a.type}"
literal type      = "${a.type}"

${matchResults.join('\n') || '(нет совпадений)'}`
  })
})

con.log('createSlice генерирует action.type из формулы name + "/" + reducerKey.')
con.info('TS даёт литеральные типы — точные строки, а не просто "string".')
con.success('Каждый actionCreator имеет .match как у createAction — type-guard.')
