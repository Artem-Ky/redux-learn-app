import {
  configureStore,
  createSlice,
  combineSlices,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

const usersSlice = createSlice({
  name: 'users',
  reducerPath: 'data/users',
  initialState: { items: [] as string[] },
  reducers: { add: (s, a: PayloadAction<string>) => { s.items.push(a.payload) } },
})

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: { increment: (s) => { s.value += 1 } },
})

const apiSliceMimic = createSlice({
  name: 'apiSlice',
  reducerPath: 'api',
  initialState: { tags: [] as string[] },
  reducers: { invalidateTags: (s, a: PayloadAction<string[]>) => { s.tags = a.payload } },
})

const rootReducer = combineSlices(usersSlice, counterSlice, apiSliceMimic)

const store = configureStore({ reducer: rootReducer })

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог reducerPath ≠ name')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const stateOut = document.getElementById('state-out')!
const slicesInfo = document.getElementById('slices-info')!

function render(): void {
  stateOut.textContent = JSON.stringify(store.getState(), null, 2)
}

slicesInfo.innerHTML = [usersSlice, counterSlice, apiSliceMimic]
  .map(
    (s) =>
      `<tr>
         <td class="val">"${s.name}"</td>
         <td class="val">"${s.reducerPath}"</td>
         <td class="val">"${s.name}/..."</td>
         <td class="val">state["${s.reducerPath}"]</td>
       </tr>`
  )
  .join('')

render()
store.subscribe(render)

const ACTS: Record<string, () => { type: string; payload?: unknown }> = {
  'users-add':   () => usersSlice.actions.add(`Alice-${Math.floor(Math.random() * 100)}`),
  'counter-inc': () => counterSlice.actions.increment(),
  'api-tag':     () => apiSliceMimic.actions.invalidateTags(['Posts', 'Users']),
}

document.querySelectorAll<HTMLButtonElement>('[data-do]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const a = ACTS[btn.dataset.do!]()
    store.dispatch(a)
    con.action(a)
    con.info(`action.type = "${a.type}" (от name), state'key = "${a.type.split('/')[0]}" → reducerPath`)
  })
})

con.log('Видите: state["data/users"] (reducerPath), но action.type = "users/add" (name).')
con.info('apiSlice mimic: name="apiSlice", reducerPath="api" — как настоящий RTK Query.')
con.success('counter: name=reducerPath="counter" — это типичный случай.')
