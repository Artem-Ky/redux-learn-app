import {
  configureStore,
  createSlice,
  combineSlices,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: { increment: (s) => { s.value += 1 } },
})

const userSlice = createSlice({
  name: 'user',
  initialState: { name: '' },
  reducers: { setName: (s, a: PayloadAction<string>) => { s.name = a.payload } },
})

const postsSlice = createSlice({
  name: 'posts',
  initialState: { items: [] as string[] },
  reducers: { add: (s, a: PayloadAction<string>) => { s.items.push(a.payload) } },
})

function themeReducer(state: { mode: string } = { mode: 'dark' }, action: { type: string; payload?: unknown }): { mode: string } {
  if (action.type === 'theme/set') return { mode: action.payload as string }
  return state
}

const rootReducer = combineSlices(counterSlice, userSlice, postsSlice, { theme: themeReducer })

const store = configureStore({ reducer: rootReducer })

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог combineSlices')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const stateOut = document.getElementById('state-out')!
function render(): void {
  stateOut.textContent = JSON.stringify(store.getState(), null, 2)
}
render()
store.subscribe(render)

const ACTS: Record<string, () => { type: string; payload?: unknown }> = {
  inc:      () => counterSlice.actions.increment(),
  setname:  () => userSlice.actions.setName('Bob'),
  addpost:  () => postsSlice.actions.add(`пост #${store.getState().posts.items.length + 1}`),
  setlight: () => ({ type: 'theme/set', payload: store.getState().theme.mode === 'dark' ? 'light' : 'dark' }),
}

document.querySelectorAll<HTMLButtonElement>('[data-act]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const a = ACTS[btn.dataset.act!]()
    store.dispatch(a)
    con.action(a)
  })
})

con.log('rootReducer = combineSlices(counter, user, posts, { theme: themeReducer }).')
con.info('Ключ в state = slice.reducerPath (по умолчанию = name).')
con.info('themeReducer — обычный reducer, добавлен через плоский map.')
con.success('Все 4 ветки работают, DevTools показывает каждую.')
