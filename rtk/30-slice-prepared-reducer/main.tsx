import { configureStore, createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface Todo {
  id: string
  text: string
  done: boolean
  createdAt: number
  addedBy?: string
}

const todosSlice = createSlice({
  name: 'todos',
  initialState: [] as Todo[],
  reducers: {
    toggleTodo: (state, action: PayloadAction<string>) => {
      const t = state.find((x) => x.id === action.payload)
      if (t) t.done = !t.done
    },
    removeTodo: (state, action: PayloadAction<string>) =>
      state.filter((x) => x.id !== action.payload),
    clearAll: () => [],

    addTodo: {
      reducer(state, action: PayloadAction<Todo>) {
        state.push(action.payload)
      },
      prepare(text: string) {
        return {
          payload: {
            id: nanoid(),
            text: text.trim(),
            done: false,
            createdAt: Date.now(),
          } as Todo,
        }
      },
    },

    addNote: {
      reducer(
        state,
        action: PayloadAction<{ id: string; text: string }, string, { user: string; ts: number }>
      ) {
        state.push({
          id: action.payload.id,
          text: action.payload.text,
          done: false,
          createdAt: action.meta.ts,
          addedBy: action.meta.user,
        })
      },
      prepare(text: string, user: string) {
        return {
          payload: { id: nanoid(), text: text.trim() },
          meta: { user, ts: Date.now() },
        }
      },
    },
  },
})

const { addTodo, addNote, toggleTodo, removeTodo, clearAll } = todosSlice.actions

const store = configureStore({ reducer: { todos: todosSlice.reducer } })

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог prepared reducers')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const listEl = document.getElementById('todo-list')!
const inputEl = document.getElementById('text') as HTMLInputElement

function render(): void {
  const todos = store.getState().todos
  if (todos.length === 0) {
    listEl.innerHTML = '— нет элементов —'
    return
  }
  listEl.innerHTML = ''
  todos.forEach((t) => {
    const row = document.createElement('div')
    row.className = 'todo-item'
    row.innerHTML = `
      <span>
        ${t.done ? '<s>' : ''}${t.text}${t.done ? '</s>' : ''}
        <span class="todo-item__id">#${t.id.slice(0, 6)}</span>
        ${t.addedBy ? `<span class="todo-item__meta">by ${t.addedBy}</span>` : ''}
        <span class="todo-item__id">${new Date(t.createdAt).toLocaleTimeString()}</span>
      </span>
      <span style="display: flex; gap: 4px;">
        <button class="btn" data-toggle="${t.id}" style="padding: 2px 8px; font-size: .7rem;">toggle</button>
        <button class="btn btn--secondary" data-remove="${t.id}" style="padding: 2px 8px; font-size: .7rem;">×</button>
      </span>`
    listEl.appendChild(row)
  })
  listEl.querySelectorAll<HTMLButtonElement>('[data-toggle]').forEach((b) => {
    b.addEventListener('click', () => {
      const a = toggleTodo(b.dataset.toggle!)
      store.dispatch(a)
      con.action(a)
    })
  })
  listEl.querySelectorAll<HTMLButtonElement>('[data-remove]').forEach((b) => {
    b.addEventListener('click', () => {
      const a = removeTodo(b.dataset.remove!)
      store.dispatch(a)
      con.action(a)
    })
  })
}
render()
store.subscribe(render)

document.getElementById('add')!.addEventListener('click', () => {
  const text = inputEl.value || 'todo'
  const a = addTodo(text)
  store.dispatch(a)
  con.action(a)
  con.info('addTodo: один аргумент text → prepare сгенерировал id, createdAt')
  inputEl.value = ''
})

document.getElementById('add-note')!.addEventListener('click', () => {
  const text = inputEl.value || 'note'
  const a = addNote(text, 'Alice')
  store.dispatch(a)
  con.action(a)
  con.info('addNote: ДВА аргумента → prepare разбил на payload + meta')
  inputEl.value = ''
})

document.getElementById('clear')!.addEventListener('click', () => {
  const a = clearAll()
  store.dispatch(a)
  con.action(a)
})

con.log('Prepared reducer = { reducer, prepare } — кастомизация payload и meta.')
con.success('Чистый reducer не знает про nanoid/Date.now — всё в prepare.')
