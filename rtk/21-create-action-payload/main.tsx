import { configureStore, createAction, createReducer, type PayloadAction } from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface User { id: number; name: string }

const increment = createAction('counter/increment')
const addBy = createAction<number>('counter/addBy')
const setUser = createAction<User>('user/set')
const tagged = createAction<string[], 'tag/set'>('tag/set')

interface State {
  counter: number
  user: User | null
  tags: string[]
}

const reducer = createReducer<State>(
  { counter: 0, user: null, tags: [] },
  (builder) => {
    builder
      .addCase(increment, (s) => { s.counter += 1 })
      .addCase(addBy, (s, a: PayloadAction<number>) => { s.counter += a.payload })
      .addCase(setUser, (s, a: PayloadAction<User>) => { s.user = a.payload })
      .addCase(tagged, (s, a: PayloadAction<string[], 'tag/set'>) => { s.tags = a.payload })
  }
)

const store = configureStore({ reducer: { main: reducer } })

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог payload-actions')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const lastEl = document.getElementById('last-action')!

function show(a: { type: string; payload?: unknown }): void {
  lastEl.textContent = JSON.stringify(a, null, 2)
  con.action(a)
}

document.getElementById('inc')!.addEventListener('click', () => {
  const a = increment()
  store.dispatch(a)
  show(a)
})

document.getElementById('add')!.addEventListener('click', () => {
  const n = Number((document.getElementById('addby-val') as HTMLInputElement).value) || 0
  const a = addBy(n)
  store.dispatch(a)
  show(a)
})

document.getElementById('set-user')!.addEventListener('click', () => {
  const a = setUser({ id: 1, name: 'Alice' })
  store.dispatch(a)
  show(a)
})

document.getElementById('set-tags')!.addEventListener('click', () => {
  const a = tagged(['alpha', 'beta', 'gamma'])
  store.dispatch(a)
  show(a)
})

con.log('Каждый action creator типизирован через generic.')
con.info('increment() — без аргументов. addBy(n) — число. setUser({id,name}) — объект.')
con.success('DevTools показывает payload в каждом action.')
