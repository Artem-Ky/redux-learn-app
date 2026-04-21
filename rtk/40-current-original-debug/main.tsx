import {
  configureStore,
  createSlice,
  current,
  original,
  nanoid,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface Todo { id: string; text: string; done: boolean; priority?: number }
interface State { items: Todo[]; processed: number }

const snapshots: { stage: string; data: unknown }[] = []

const todosSlice = createSlice({
  name: 'todos',
  initialState: { items: [], processed: 0 } as State,
  reducers: {
    addBatch: (state, action: PayloadAction<Todo[]>) => {
      state.items.push(...action.payload)
    },
    markSomeDone: (state) => {
      state.items.slice(0, 3).forEach((t) => { t.done = true })
    },
    clear: () => ({ items: [], processed: 0 }),

    processTodos: (state) => {
      snapshots.length = 0
      snapshots.push({ stage: '1. До фильтрации (current(state))', data: current(state) })
      snapshots.push({ stage: '1a. original(state) (исходник до reducer'+'а)', data: original(state) })

      const beforeItems = state.items
      const beforeRef = original(state.items)

      state.items = state.items.filter((t) => !t.done)
      snapshots.push({
        stage: '2. После filter (current(state))',
        data: current(state),
      })

      snapshots.push({
        stage: '2a. Сравнение ссылок',
        data: {
          'state.items === before (same draft access)': state.items === beforeItems,
          'original(state.items) === оригинальная ссылка': original(state.items) === beforeRef,
        },
      })

      state.items.forEach((t, i) => { t.priority = (i + 1) * 10 })
      snapshots.push({ stage: '3. После добавления priority', data: current(state) })

      state.processed += 1
      snapshots.push({ stage: '4. Финал (после processed++)', data: current(state) })
    },
  },
})

const { addBatch, markSomeDone, processTodos, clear } = todosSlice.actions

const store = configureStore({ reducer: todosSlice.reducer })

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог current()/original()')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const stateOut = document.getElementById('state-out')!
const snapsOut = document.getElementById('snapshots-out')!

function render(): void {
  stateOut.textContent = JSON.stringify(store.getState(), null, 2)
  if (snapshots.length === 0) {
    snapsOut.textContent = '— нажмите "processTodos" —'
    return
  }
  snapsOut.textContent = snapshots
    .map((s) => `>>> ${s.stage}\n${JSON.stringify(s.data, null, 2)}`)
    .join('\n\n')
  snapsOut.scrollTop = snapsOut.scrollHeight
}
render()
store.subscribe(render)

document.getElementById('add-multi')!.addEventListener('click', () => {
  const items: Todo[] = ['hello', 'world', 'foo', 'bar', 'baz'].map((text) => ({
    id: nanoid(),
    text,
    done: false,
  }))
  const a = addBatch(items)
  store.dispatch(a)
  con.action(a)
})

document.getElementById('mark-some')!.addEventListener('click', () => {
  const a = markSomeDone()
  store.dispatch(a)
  con.action(a)
})

document.getElementById('process')!.addEventListener('click', () => {
  if (store.getState().items.length === 0) {
    con.warn('Сначала добавьте todos')
    return
  }
  con.info('processTodos: 5 snapshot'+'ов будет залогировано в reducer'+'е')
  const a = processTodos()
  store.dispatch(a)
  con.action(a)
  con.success(`Готово. ${snapshots.length} snapshot'ов записано (см. блок ниже).`)
})

document.getElementById('clear')!.addEventListener('click', () => {
  snapshots.length = 0
  const a = clear()
  store.dispatch(a)
  con.action(a)
})

con.log('current(state) — snapshot draft'+'а на текущий момент.')
con.info('original(state) — ссылка на исходный объект до reducer'+'а.')
con.success('Используйте только в дебаге — current() делает глубокую копию (медленно для большого state).')
