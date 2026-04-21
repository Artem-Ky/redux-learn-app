import {
  configureStore,
  combineSlices,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment: (s) => { s.value += 1 },
  },
  selectors: {
    selectValue: (s) => s.value,
  },
})

const todosSlice = createSlice({
  name: 'todos',
  initialState: { items: [] as string[] },
  reducers: {
    add: (s, a: PayloadAction<string>) => { s.items.push(a.payload) },
  },
  selectors: {
    selectCount: (s) => s.items.length,
  },
})

const userSlice = createSlice({
  name: 'user',
  initialState: { name: '' },
  reducers: {
    setName: (s, a: PayloadAction<string>) => { s.name = a.payload },
  },
  selectors: {
    selectName: (s) => s.name,
  },
})

const rootReducer = combineSlices(counterSlice, todosSlice, userSlice)

const store = configureStore({ reducer: rootReducer })

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог feature folders')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const modelOutput = document.getElementById('model-output')!

const model = `
// === src/app/store.ts ===
export const rootReducer = combineSlices(counterSlice, todosSlice, userSlice)
export const store = configureStore({ reducer: rootReducer })
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// === src/features/counter/counterSlice.ts ===
export const counterSlice = createSlice({
  name: '${counterSlice.name}',
  initialState: ${JSON.stringify(counterSlice.getInitialState())},
  reducers: { increment },
  selectors: { selectValue }
})

// === src/features/todos/todosSlice.ts ===
export const todosSlice = createSlice({
  name: '${todosSlice.name}',
  initialState: ${JSON.stringify(todosSlice.getInitialState())},
  reducers: { add },
  selectors: { selectCount }
})

// === src/features/user/userSlice.ts ===
export const userSlice = createSlice({
  name: '${userSlice.name}',
  initialState: ${JSON.stringify(userSlice.getInitialState())},
  reducers: { setName },
  selectors: { selectName }
})

// Используем actions:
dispatch(counterSlice.actions.increment())  →  state.counter.value: ${counterSlice.selectors.selectValue(store.getState())}
dispatch(todosSlice.actions.add('hello'))   →  state.todos.items.length: ${todosSlice.selectors.selectCount(store.getState())}
dispatch(userSlice.actions.setName('A'))    →  state.user.name: "${userSlice.selectors.selectName(store.getState())}"
`.trim()

modelOutput.textContent = model

let i = 0
function tick(): void {
  i++
  if (i % 3 === 1) {
    const a = counterSlice.actions.increment()
    store.dispatch(a)
    con.action(a)
  } else if (i % 3 === 2) {
    const a = todosSlice.actions.add(`task ${i}`)
    store.dispatch(a)
    con.action(a)
  } else {
    const a = userSlice.actions.setName(`User ${i}`)
    store.dispatch(a)
    con.action(a)
  }
  modelOutput.textContent = model
    .replace(/state\.counter\.value: \d+/, `state.counter.value: ${counterSlice.selectors.selectValue(store.getState())}`)
    .replace(/state\.todos\.items\.length: \d+/, `state.todos.items.length: ${todosSlice.selectors.selectCount(store.getState())}`)
    .replace(/state\.user\.name: "[^"]*"/, `state.user.name: "${userSlice.selectors.selectName(store.getState())}"`)
}

const tickBtn = document.createElement('button')
tickBtn.className = 'btn'
tickBtn.textContent = 'симулировать одно действие'
tickBtn.style.marginTop = '8px'
modelOutput.parentElement!.appendChild(tickBtn)
tickBtn.addEventListener('click', tick)

con.log('Это структура файлов из Redux Style Guide.')
con.info('Каждая фича — папка. Slice + UI + selectors + tests рядом.')
con.success('Жмите "симулировать действие" и смотрите как меняется state.')
