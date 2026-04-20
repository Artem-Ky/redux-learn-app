import { configureStore, createAction, createReducer, nanoid } from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface Todo { id: string; text: string; done: boolean }
interface User { id: string; name: string; age: number }

const addTodo = createAction('todos/add', (text: string) => ({
  payload: { id: nanoid(), text, done: false } as Todo,
}))

const addUser = createAction('users/add', (name: string, age: number) => ({
  payload: { id: nanoid(), name, age } as User,
}))

const logged = createAction('event/logged', (message: string) => ({
  payload: message,
  meta: { timestamp: Date.now(), source: 'user-action' },
}))

const failed = createAction('fetch/failed', (err: Error) => ({
  payload: err.message,
  error: true,
  meta: { name: err.name, stack: err.stack },
}))

interface State {
  todos: Todo[]
  users: User[]
  events: { message: string; meta: unknown }[]
  errors: { payload: string; meta: unknown }[]
}

const reducer = createReducer<State>(
  { todos: [], users: [], events: [], errors: [] },
  (b) => {
    b.addCase(addTodo, (s, a) => { s.todos.push(a.payload) })
     .addCase(addUser, (s, a) => { s.users.push(a.payload) })
     .addCase(logged, (s, a) => { s.events.push({ message: a.payload, meta: a.meta }) })
     .addCase(failed, (s, a) => { s.errors.push({ payload: a.payload, meta: a.meta }) })
  }
)

const store = configureStore({ reducer: { main: reducer } })

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог prepare-actions')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

function show(id: string, action: unknown): void {
  document.getElementById(id)!.textContent = JSON.stringify(action, null, 2)
}

const DEMOS: Record<string, () => unknown> = {
  todo: () => {
    const phrases = ['купить хлеб', 'позвонить маме', 'дописать RTK курс', 'выпить кофе']
    const text = phrases[Math.floor(Math.random() * phrases.length)]
    const a = addTodo(text)
    store.dispatch(a)
    show('out-todo', a)
    return a
  },
  user: () => {
    const a = addUser('Alice', 30)
    store.dispatch(a)
    show('out-user', a)
    return a
  },
  meta: () => {
    const a = logged('hello')
    store.dispatch(a)
    show('out-meta', { ...a, meta: { ...a.meta, timestamp: `${a.meta.timestamp} (${new Date(a.meta.timestamp).toISOString()})` } })
    return a
  },
  error: () => {
    const a = failed(new Error('404 Not Found'))
    store.dispatch(a)
    const view = {
      ...a,
      meta: { ...a.meta, stack: typeof a.meta.stack === 'string' ? a.meta.stack.split('\n')[0] + '\n…' : a.meta.stack },
    }
    show('out-err', view)
    return a
  },
}

document.querySelectorAll<HTMLButtonElement>('[data-demo]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const a = DEMOS[btn.dataset.demo!]()
    con.action(a as { type: string })
  })
})

con.log('prepare получает аргументы creator'+'а и возвращает { payload, meta?, error? }.')
con.info('nanoid() генерирует id ВНУТРИ prepare — так reducer остаётся чистым.')
con.success('Смотрите DevTools: в actions вкладка Action показывает полную структуру с meta/error.')
