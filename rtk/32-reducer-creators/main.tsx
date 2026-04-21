import { configureStore, buildCreateSlice, asyncThunkCreator, nanoid } from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

const createAppSlice = buildCreateSlice({
  creators: { asyncThunk: asyncThunkCreator },
})

interface Todo { id: string; text: string; done: boolean }
interface TodoState { items: Todo[]; loading: boolean; error: string | null }

let shouldFail = false
async function mockFetch(): Promise<Todo[]> {
  await new Promise((r) => setTimeout(r, 600))
  if (shouldFail) throw new Error('Network error 500')
  return [
    { id: nanoid(), text: 'из API: первая', done: false },
    { id: nanoid(), text: 'из API: вторая', done: true },
    { id: nanoid(), text: 'из API: третья', done: false },
  ]
}

const todosSlice = createAppSlice({
  name: 'todos',
  initialState: { items: [], loading: false, error: null } as TodoState,
  reducers: (create) => ({
    deleteTodo: create.reducer<string>((state, action) => {
      state.items = state.items.filter((t) => t.id !== action.payload)
    }),

    addTodo: create.preparedReducer(
      (text: string) => ({ payload: { id: nanoid(), text, done: false } as Todo }),
      (state, action) => { state.items.push(action.payload) }
    ),

    clearTodos: create.reducer((state) => { state.items = []; state.error = null }),

    fetchTodos: create.asyncThunk(
      async () => mockFetch(),
      {
        pending:   (state) => { state.loading = true; state.error = null },
        fulfilled: (state, action) => { state.items = action.payload },
        rejected:  (state, action) => { state.error = action.error.message ?? 'unknown' },
        settled:   (state) => { state.loading = false },
      }
    ),
  }),
})

const { addTodo, deleteTodo, clearTodos, fetchTodos } = todosSlice.actions

const store = configureStore({ reducer: { todos: todosSlice.reducer } })

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог reducer creators')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const listEl = document.getElementById('list')!
const inputEl = document.getElementById('text') as HTMLInputElement

function render(): void {
  const s = store.getState().todos
  if (s.loading) {
    listEl.innerHTML = '<div class="crud-loading">⏳ загрузка с сервера...</div>'
    return
  }
  if (s.error) {
    listEl.innerHTML = `<div class="crud-error">✗ Ошибка: ${s.error}</div>`
    return
  }
  if (s.items.length === 0) {
    listEl.innerHTML = '— нет элементов —'
    return
  }
  listEl.innerHTML = ''
  s.items.forEach((t) => {
    const row = document.createElement('div')
    row.className = 'crud-row'
    row.innerHTML = `
      <span>${t.done ? '<s>' : ''}${t.text}${t.done ? '</s>' : ''}
        <span style="color: var(--text-muted); font-size: .7rem;">#${t.id.slice(0, 6)}</span></span>
      <button class="btn btn--secondary" data-del="${t.id}" style="padding: 2px 8px; font-size: .7rem;">×</button>`
    listEl.appendChild(row)
  })
  listEl.querySelectorAll<HTMLButtonElement>('[data-del]').forEach((b) => {
    b.addEventListener('click', () => {
      const a = deleteTodo(b.dataset.del!)
      store.dispatch(a)
      con.action(a)
    })
  })
}
render()
store.subscribe(render)

document.getElementById('add')!.addEventListener('click', () => {
  const a = addTodo(inputEl.value || 'todo')
  store.dispatch(a)
  con.action(a)
  inputEl.value = ''
})

document.getElementById('fetch')!.addEventListener('click', () => {
  shouldFail = false
  con.info('dispatch fetchTodos() — увидим pending → fulfilled → settled')
  store.dispatch(fetchTodos())
    .then((res) => con.success(`thunk завершился: ${res.meta.requestStatus}`))
})

document.getElementById('fetch-fail')!.addEventListener('click', () => {
  shouldFail = true
  con.warn('dispatch fetchTodos() — будет pending → rejected → settled')
  store.dispatch(fetchTodos())
    .then((res) => con.warn(`thunk завершился: ${res.meta.requestStatus}`))
})

document.getElementById('clear-todos')!.addEventListener('click', () => {
  const a = clearTodos()
  store.dispatch(a)
  con.action(a)
})

con.log('Используется buildCreateSlice + asyncThunkCreator.')
con.info('addTodo = create.preparedReducer — id и done в prepare.')
con.info('fetchTodos = create.asyncThunk — actions внутри pending/fulfilled/rejected/settled.')
con.success('Слайс полностью замкнутый: и actions, и reducer, и thunk — в одном месте.')
