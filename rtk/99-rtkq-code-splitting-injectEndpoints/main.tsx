import { configureStore } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { Provider } from 'react-redux'
import { StrictMode, Suspense, lazy, useEffect, useState, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface Post { id: number; title: string }
interface User { id: number; name: string }
interface Comment { id: number; postId: number; text: string }

async function mockFetch(input: RequestInfo | URL): Promise<Response> {
  const url = typeof input === 'string' ? input : (input as Request).url
  await new Promise(r => setTimeout(r, 300))
  if (/\/posts$/.test(url)) return new Response(JSON.stringify([{ id: 1, title: 'First post' }, { id: 2, title: 'Second' }]))
  if (/\/users$/.test(url)) return new Response(JSON.stringify([{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]))
  if (/\/comments$/.test(url)) return new Response(JSON.stringify([{ id: 1, postId: 1, text: 'nice!' }]))
  return new Response('{}', { status: 404 })
}

// ── тонкий root api — без endpoints ─────────────────────────────────
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://mock.local/', fetchFn: mockFetch as typeof fetch }),
  tagTypes: ['Post', 'User', 'Comment'],
  endpoints: () => ({}), // пусто! endpoints впрыснутся динамически
})

const store = configureStore({
  reducer: { [api.reducerPath]: api.reducer },
  middleware: (gdm) => gdm().concat(api.middleware),
})

const con = new ConsolePanel(document.getElementById('console-container')!,
  'injectEndpoints — динамическое добавление endpoints')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

// ── "feature modules" (имитация dynamic import) ──────────────────────
const postsModule = {
  async load(): Promise<{ useGetPostsQuery: () => { data?: Post[]; isLoading: boolean } }> {
    con.action({ type: 'lazy → import(./posts.ts)' }, 'split')
    await new Promise(r => setTimeout(r, 400)) // имитация загрузки chunk

    const injected = api.injectEndpoints({
      endpoints: (build) => ({
        getPosts: build.query<Post[], void>({
          query: () => 'posts',
          providesTags: [{ type: 'Post', id: 'LIST' }],
        }),
      }),
      overrideExisting: false,
    })
    con.success('posts feature injected → api.endpoints.getPosts доступен')
    window.dispatchEvent(new CustomEvent('ep-update'))
    return { useGetPostsQuery: (injected as unknown as { useGetPostsQuery: () => { data?: Post[]; isLoading: boolean } }).useGetPostsQuery }
  },
}

const usersModule = {
  async load(): Promise<{ useGetUsersQuery: () => { data?: User[]; isLoading: boolean } }> {
    con.action({ type: 'lazy → import(./users.ts)' }, 'split')
    await new Promise(r => setTimeout(r, 400))
    const injected = api.injectEndpoints({
      endpoints: (build) => ({
        getUsers: build.query<User[], void>({
          query: () => 'users',
          providesTags: [{ type: 'User', id: 'LIST' }],
        }),
      }),
    })
    con.success('users feature injected')
    window.dispatchEvent(new CustomEvent('ep-update'))
    return { useGetUsersQuery: (injected as unknown as { useGetUsersQuery: () => { data?: User[]; isLoading: boolean } }).useGetUsersQuery }
  },
}

const commentsModule = {
  async load(): Promise<{ useGetCommentsQuery: () => { data?: Comment[]; isLoading: boolean } }> {
    con.action({ type: 'lazy → import(./comments.ts)' }, 'split')
    await new Promise(r => setTimeout(r, 400))
    const injected = api.injectEndpoints({
      endpoints: (build) => ({
        getComments: build.query<Comment[], void>({
          query: () => 'comments',
          providesTags: [{ type: 'Comment', id: 'LIST' }],
        }),
      }),
    })
    con.success('comments feature injected')
    window.dispatchEvent(new CustomEvent('ep-update'))
    return { useGetCommentsQuery: (injected as unknown as { useGetCommentsQuery: () => { data?: Comment[]; isLoading: boolean } }).useGetCommentsQuery }
  },
}

function InjectedList(): ReactElement {
  const [, force] = useState(0)
  useEffect(() => {
    const h = (): void => force(n => n + 1)
    window.addEventListener('ep-update', h)
    return () => window.removeEventListener('ep-update', h)
  }, [])
  const endpoints = Object.keys((api as unknown as { endpoints: Record<string, unknown> }).endpoints)
  return (
    <div>
      <h5 style={{ color: 'var(--accent-cyan)', fontSize: '.82rem', margin: '0 0 4px' }}>
        api.endpoints (live): <strong>{endpoints.length}</strong>
      </h5>
      <div className="injected-list">
        {endpoints.length === 0
          ? <span style={{ color: 'var(--text-muted)' }}>— пусто, feature не загружены —</span>
          : endpoints.map(name => (
            <div key={name} className="injected-list__item">• {name}</div>
          ))
        }
      </div>
    </div>
  )
}

// ── "страницы" (каждая загружает свою feature) ──────────────────────
function PostsPage(): ReactElement {
  const [hook, setHook] = useState<(() => { data?: Post[]; isLoading: boolean }) | null>(null)
  useEffect(() => { postsModule.load().then(m => setHook(() => m.useGetPostsQuery)) }, [])
  const data = hook?.()
  if (!data) return <div style={{ color: 'var(--text-muted)' }}>loading chunk…</div>
  if (data.isLoading) return <div style={{ color: 'var(--text-muted)' }}>fetching posts…</div>
  return <div>{data.data?.map(p => <div key={p.id} style={{ padding: 3, fontFamily: 'var(--font-mono)', fontSize: '.78rem' }}>📄 #{p.id} · {p.title}</div>)}</div>
}

function UsersPage(): ReactElement {
  const [hook, setHook] = useState<(() => { data?: User[]; isLoading: boolean }) | null>(null)
  useEffect(() => { usersModule.load().then(m => setHook(() => m.useGetUsersQuery)) }, [])
  const data = hook?.()
  if (!data) return <div style={{ color: 'var(--text-muted)' }}>loading chunk…</div>
  if (data.isLoading) return <div style={{ color: 'var(--text-muted)' }}>fetching users…</div>
  return <div>{data.data?.map(u => <div key={u.id} style={{ padding: 3, fontFamily: 'var(--font-mono)', fontSize: '.78rem' }}>👤 #{u.id} · {u.name}</div>)}</div>
}

function CommentsPage(): ReactElement {
  const [hook, setHook] = useState<(() => { data?: Comment[]; isLoading: boolean }) | null>(null)
  useEffect(() => { commentsModule.load().then(m => setHook(() => m.useGetCommentsQuery)) }, [])
  const data = hook?.()
  if (!data) return <div style={{ color: 'var(--text-muted)' }}>loading chunk…</div>
  if (data.isLoading) return <div style={{ color: 'var(--text-muted)' }}>fetching comments…</div>
  return <div>{data.data?.map(c => <div key={c.id} style={{ padding: 3, fontFamily: 'var(--font-mono)', fontSize: '.78rem' }}>💬 #{c.id} · {c.text}</div>)}</div>
}

function App(): ReactElement {
  const [loaded, setLoaded] = useState<Set<string>>(new Set())

  return (
    <div>
      <div className="feature-bar">
        <button className="btn btn--accent" onClick={() => setLoaded(s => new Set(s).add('posts'))}>загрузить posts feature</button>
        <button className="btn btn--accent" onClick={() => setLoaded(s => new Set(s).add('users'))}>загрузить users feature</button>
        <button className="btn btn--accent" onClick={() => setLoaded(s => new Set(s).add('comments'))}>загрузить comments feature</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <div className="feature-panel">
          <h5 style={{ color: 'var(--accent-cyan)', fontSize: '.82rem', margin: '0 0 6px' }}>Posts</h5>
          {loaded.has('posts') ? <PostsPage /> : <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>feature не загружена</div>}
        </div>
        <div className="feature-panel">
          <h5 style={{ color: 'var(--accent-cyan)', fontSize: '.82rem', margin: '0 0 6px' }}>Users</h5>
          {loaded.has('users') ? <UsersPage /> : <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>feature не загружена</div>}
        </div>
        <div className="feature-panel">
          <h5 style={{ color: 'var(--accent-cyan)', fontSize: '.82rem', margin: '0 0 6px' }}>Comments</h5>
          {loaded.has('comments') ? <CommentsPage /> : <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>feature не загружена</div>}
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <InjectedList />
      </div>
    </div>
  )
}

const host = document.getElementById('react-root')!
createRoot(host).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)

con.info('1. На старте api.endpoints пустой.')
con.info('2. Жми "загрузить posts" → dynamic import (имитация 400ms) → api.injectEndpoints.')
con.info('3. Внизу видишь как list endpoints растёт. В prod-бандле каждая feature — отдельный chunk.')
