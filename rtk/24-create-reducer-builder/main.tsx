import { configureStore, createAction, createReducer, nanoid } from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface Todo { id: string; text: string; done: boolean }

const addTodo = createAction('todos/add', (text: string) => ({
  payload: { id: nanoid(), text, done: false } as Todo,
}))
const toggleTodo = createAction<string>('todos/toggle')
const removeTodo = createAction<string>('todos/remove')
const clearAll = createAction('todos/clearAll')

const todosReducer = createReducer<Todo[]>([], (builder) => {
  builder
    .addCase(addTodo, (state, action) => {
      state.push(action.payload)
    })
    .addCase(toggleTodo, (state, action) => {
      const t = state.find((x) => x.id === action.payload)
      if (t) t.done = !t.done
    })
    .addCase(removeTodo, (state, action) => {
      return state.filter((x) => x.id !== action.payload)
    })
    .addCase(clearAll, () => [])
})

const store = configureStore({ reducer: { todos: todosReducer } })

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог todos')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const listEl = document.getElementById('todo-list')!
const inputEl = document.getElementById('todo-text') as HTMLInputElement

function render(): void {
  const todos = store.getState().todos
  if (todos.length === 0) {
    listEl.innerHTML = '— нет задач —'
    return
  }
  listEl.innerHTML = ''
  todos.forEach((t) => {
    const row = document.createElement('div')
    row.className = `todo-item${t.done ? ' done' : ''}`
    row.innerHTML = `
      <span>[${t.done ? '✓' : ' '}] ${t.text} <span style="color: var(--text-muted); font-size: .7rem;">#${t.id.slice(0, 6)}</span></span>
      <span style="display: flex; gap: 6px;">
        <button class="btn" data-toggle="${t.id}" style="padding: 2px 8px; font-size: .7rem;">toggle</button>
        <button class="btn btn--secondary" data-remove="${t.id}" style="padding: 2px 8px; font-size: .7rem;">×</button>
      </span>`
    listEl.appendChild(row)
  })
  listEl.querySelectorAll<HTMLButtonElement>('[data-toggle]').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.dataset.toggle!
      const a = toggleTodo(id)
      store.dispatch(a)
      con.action(a)
    })
  })
  listEl.querySelectorAll<HTMLButtonElement>('[data-remove]').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.dataset.remove!
      const a = removeTodo(id)
      store.dispatch(a)
      con.action(a)
    })
  })
}

store.subscribe(render)

document.getElementById('add-todo')!.addEventListener('click', () => {
  const text = inputEl.value.trim() || 'новая задача'
  const a = addTodo(text)
  store.dispatch(a)
  con.action(a)
  inputEl.value = ''
  inputEl.focus()
})

inputEl.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    (document.getElementById('add-todo') as HTMLButtonElement).click()
  }
})

document.getElementById('clear-todos')!.addEventListener('click', () => {
  const a = clearAll()
  store.dispatch(a)
  con.action(a)
})

render()

con.log('Reducer построен через createReducer + builder.addCase().')
con.info('Внутри addCase можно "мутировать" state — это Immer draft.')
con.success('Также работает возврат нового значения: return state.filter(...) — см. removeTodo.')
