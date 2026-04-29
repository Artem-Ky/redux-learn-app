import { configureStore } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { Provider } from 'react-redux'
import { StrictMode, useEffect, useState, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface Todo { id: number; title: string; done: boolean }

const TODOS: Todo[] = [
  { id: 1, title: 'Изучить optimistic updates', done: false },
  { id: 2, title: 'Написать mutation', done: false },
  { id: 3, title: 'Запушить в прод', done: false },
  { id: 4, title: 'Проверить rollback', done: false },
]

let failNextPatch = false

async function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : (input as Request).url
  const method = init?.method ?? 'GET'
  await new Promise(r => setTimeout(r, 600))

  if (method === 'GET' && /\/todos$/.test(url)) {
    return new Response(JSON.stringify(TODOS), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  const m = /\/todos\/(\d+)$/.exec(url)
  if (method === 'PATCH' && m) {
    if (failNextPatch) {
      failNextPatch = false
      return new Response(JSON.stringify({ error: 'db timeout' }), { status: 500 })
    }
    const id = Number(m[1])
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    const t = TODOS.find(x => x.id === id)
    if (!t) return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
    Object.assign(t, body)
    return new Response(JSON.stringify(t), { status: 200 })
  }
  return new Response('{}', { status: 404 })
}

const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://mock.local/', fetchFn: mockFetch as typeof fetch }),
  endpoints: (build) => ({
    getTodos: build.query<Todo[], void>({
      query: () => 'todos',
    }),
    toggleTodo: build.mutation<Todo, { id: number; done: boolean }>({
      query: ({ id, done }) => ({ url: `todos/${id}`, method: 'PATCH', body: { done } }),
      async onQueryStarted({ id, done }, { dispatch, queryFulfilled }) {
        con.info(`▶ optimistic patch · todo#${id} done=${done}`)
        const patchResult = dispatch(
          api.util.updateQueryData('getTodos', undefined, (draft) => {
            const t = draft.find(x => x.id === id)
            if (t) t.done = done
          })
        )
        try {
          await queryFulfilled
          con.success(`✔ server OK · todo#${id}`)
        } catch (err) {
          con.error(`✖ server FAIL · todo#${id} → rollback через patchResult.undo()`)
          patchResult.undo()
        }
      },
    }),
  }),
})

const { useGetTodosQuery, useToggleTodoMutation } = api

const store = configureStore({
  reducer: { [api.reducerPath]: api.reducer },
  middleware: (gdm) => gdm().concat(api.middleware),
})

const con = new ConsolePanel(document.getElementById('console-container')!,
  'Optimistic updates — мгновенный UI + rollback')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

function TodoList(): ReactElement {
  const q = useGetTodosQuery()
  const [trigger] = useToggleTodoMutation()
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set())
  const [revertedIds, setRevertedIds] = useState<Set<number>>(new Set())

  const onToggle = async (id: number, done: boolean): Promise<void> => {
    setPendingIds(p => new Set(p).add(id))
    setRevertedIds(r => { const n = new Set(r); n.delete(id); return n })
    try {
      await trigger({ id, done }).unwrap()
    } catch {
      setRevertedIds(r => new Set(r).add(id))
      setTimeout(() => {
        setRevertedIds(r => { const n = new Set(r); n.delete(id); return n })
      }, 2000)
    }
    setPendingIds(p => { const n = new Set(p); n.delete(id); return n })
  }

  if (q.isLoading) return <div style={{ color: 'var(--text-muted)', padding: 10 }}>загрузка…</div>

  return (
    <div>
      {q.data?.map(t => {
        const isPending = pendingIds.has(t.id)
        const isReverted = revertedIds.has(t.id)
        return (
          <div key={t.id} className={`todo-row ${isReverted ? 'reverted' : isPending ? 'pending' : 'success'}`}>
            <input type="checkbox" checked={t.done} onChange={e => onToggle(t.id, e.target.checked)} />
            <span className="todo-row__title" style={{ textDecoration: t.done ? 'line-through' : 'none' }}>
              #{t.id} · {t.title}
            </span>
            <span className={`todo-row__status ${isReverted ? 'r' : isPending ? 'p' : 's'}`}>
              {isReverted ? 'ROLLED BACK' : isPending ? 'PENDING' : t.done ? 'DONE' : 'OPEN'}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '.7rem', textAlign: 'right' }}>
              {isPending ? '~600ms' : ''}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function App(): ReactElement {
  useEffect(() => {
    const $fail = document.getElementById('fail-next') as HTMLInputElement
    const h = (): void => {
      failNextPatch = $fail.checked
      con.warn(`failNextPatch = ${failNextPatch} — следующий PATCH ${failNextPatch ? 'упадёт с 500' : 'успешен'}`)
    }
    $fail.addEventListener('change', h)
    return () => $fail.removeEventListener('change', h)
  }, [])

  return <TodoList />
}

const host = document.getElementById('react-root')!
createRoot(host).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)

con.info('1. Кликни checkbox — он ставится МГНОВЕННО, не дожидаясь 600ms сервера.')
con.info('2. Включи "следующий PATCH → 500" → кликни — увидишь как чекбокс откатывается через 600ms.')
con.info('3. Лог показывает: optimistic patch → server OK/FAIL → (undo).')
