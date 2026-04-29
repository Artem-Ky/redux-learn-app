import { configureStore } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { Provider } from 'react-redux'
import { StrictMode, useState, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── mock ──────────────────────────────────────────────────────────
interface Post { id: number; title: string; body: string }
const POSTS: Post[] = [
  { id: 1, title: 'Hello', body: 'first' },
  { id: 2, title: 'Redux', body: 'second' },
]
let seq = POSTS.length

async function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : (input as Request).url ?? String(input)
  const method = init?.method ?? 'GET'
  await new Promise((r) => setTimeout(r, 500))

  if (method === 'GET' && url.endsWith('/posts')) {
    return new Response(JSON.stringify(POSTS), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  if (method === 'POST' && url.endsWith('/posts')) {
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    if (body.__fail) {
      return new Response(JSON.stringify({ code: 'VALIDATION_ERROR', message: 'title is required' }), { status: 422 })
    }
    seq += 1
    const next: Post = { id: seq, title: String(body.title ?? ''), body: String(body.body ?? '') }
    POSTS.push(next)
    return new Response(JSON.stringify(next), { status: 201, headers: { 'content-type': 'application/json' } })
  }
  return new Response(JSON.stringify({ error: 'unknown' }), { status: 500 })
}

// ── api ───────────────────────────────────────────────────────────
const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://mock.local/', fetchFn: mockFetch as typeof fetch }),
  tagTypes: ['Post'],
  endpoints: (build) => ({
    getPosts: build.query<Post[], void>({
      query: () => 'posts',
      providesTags: (result) =>
        result
          ? [...result.map((p) => ({ type: 'Post' as const, id: p.id })), { type: 'Post' as const, id: 'LIST' }]
          : [{ type: 'Post' as const, id: 'LIST' }],
    }),
    addPost: build.mutation<Post, { title: string; body: string; __fail?: boolean }>({
      query: (body) => ({ url: 'posts', method: 'POST', body }),
      invalidatesTags: [{ type: 'Post', id: 'LIST' }],
    }),
  }),
})

const { useAddPostMutation, useGetPostsQuery } = api

const store = configureStore({
  reducer: { [api.reducerPath]: api.reducer },
  middleware: (gdm) => gdm().concat(api.middleware),
})

// ── panels ────────────────────────────────────────────────────────
const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог mutation — trigger → pending → fulfilled / rejected')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

// ── helpers ────────────────────────────────────────────────────────
function flagClass(v: boolean, errTone = false): string {
  return v ? (errTone ? 'e' : 't') : 'f'
}

// ── React root ────────────────────────────────────────────────────
function FormCard(): ReactElement {
  const [title, setTitle] = useState<string>('RTK Query is cool')
  const [body, setBody] = useState<string>('sample text')
  const [trigger, state] = useAddPostMutation()
  const [, sharedA] = useAddPostMutation({ fixedCacheKey: 'addPost-shared' })
  const [triggerShared, sharedB] = useAddPostMutation({ fixedCacheKey: 'addPost-shared' })
  const { data: postsList, refetch } = useGetPostsQuery()
  const [lastResultText, setLastResultText] = useState<string>('—')
  const [lastResultClass, setLastResultClass] = useState<string>('')

  const onTrigger = async (): Promise<void> => {
    con.info(`trigger addPost({ title: '${title}', body: '${body}' })`)
    try {
      const res = await trigger({ title, body }).unwrap()
      setLastResultText(`unwrap → ${JSON.stringify(res)}`)
      setLastResultClass('fulfilled')
      con.success(`unwrap() вернул Post #${res.id}`)
    } catch (err) {
      setLastResultText(`unwrap threw: ${JSON.stringify(err).slice(0, 80)}`)
      setLastResultClass('rejected')
    }
  }

  const onFail = async (): Promise<void> => {
    con.warn('trigger addPost({ __fail: true }) → 422')
    try {
      await trigger({ title: '', body: '', __fail: true }).unwrap()
    } catch (err) {
      setLastResultText(`unwrap threw: ${JSON.stringify(err).slice(0, 80)}`)
      setLastResultClass('rejected')
      con.error(`rejected: ${JSON.stringify(err)}`)
    }
  }

  const onReset = (): void => {
    state.reset()
    setLastResultText('—')
    setLastResultClass('')
    con.info('state.reset() — флаги → isUninitialized, data=undefined')
  }

  return (
    <>
      <div className="form-card">
        <h4>Форма — создать пост</h4>
        <div className="form-row">
          <label>title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="form-row">
          <label>body</label>
          <input type="text" value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <div className="btn-group" style={{ marginTop: 10 }}>
          <button className="btn btn--accent" onClick={onTrigger} disabled={state.isLoading}>▶ addPost (trigger)</button>
          <button className="btn btn--danger" onClick={onFail} disabled={state.isLoading}>▶ addPost + fail</button>
          <button className="btn" onClick={onReset}>reset()</button>
        </div>
        <div className="trig-mon">
          <div className="trig-mon__row">
            <span className="trig-mon__key">last trigger result</span>
            <span className={`trig-mon__val ${lastResultClass}`}>{lastResultText}</span>
          </div>
        </div>

        <h4 style={{ marginTop: 14 }}>Все посты (getPosts cache)</h4>
        <button className="btn" onClick={() => refetch()}>↻ refetch getPosts</button>
        <div className="posts-list">
          {postsList === undefined
            ? <div style={{ color: 'var(--text-muted)', fontSize: '.76rem', padding: '4px 10px' }}>— загрузка —</div>
            : postsList.map((p) => (
              <div className="post-item" key={p.id}>
                #{p.id} — {p.title} <span style={{ color: 'var(--text-muted)' }}>· {p.body}</span>
              </div>
            ))}
        </div>
      </div>

      <div className="ret-panel">
        <h4>Return tuple — useAddPostMutation() [1]</h4>
        <div>
          {[
            { name: 'isUninitialized', v: state.isUninitialized, hint: 'trigger ещё не вызывали' },
            { name: 'isLoading',       v: state.isLoading,       hint: 'pending (только на время запроса)' },
            { name: 'isSuccess',       v: state.isSuccess,       hint: 'последний вызов — fulfilled' },
            { name: 'isError',         v: state.isError,         hint: 'последний вызов — rejected', err: true },
          ].map((f) => (
            <div className="ret-row" key={f.name}>
              <span className="ret-row__name">{f.name}</span>
              <span className={`ret-row__val ${flagClass(f.v, f.err)}`}>{String(f.v)}</span>
              <span className="ret-row__hint">{f.hint}</span>
            </div>
          ))}
          <div className="ret-row">
            <span className="ret-row__name">status</span>
            <span className="ret-row__val t" style={{ background: 'rgba(86,156,214,.2)', color: 'var(--accent)' }}>{state.status}</span>
            <span className="ret-row__hint">uninit | pending | fulfilled | rejected</span>
          </div>
          <div className="ret-row">
            <span className="ret-row__name">requestId</span>
            <span className="ret-row__val f">{state.requestId ? state.requestId.slice(0, 10) + '…' : '—'}</span>
            <span className="ret-row__hint">ключ в state.api.mutations</span>
          </div>
        </div>

        <h4 style={{ marginTop: 14 }}>originalArgs / data / error</h4>
        <div className="data-preview">{state.originalArgs ? JSON.stringify(state.originalArgs, null, 2) : '—'}</div>
        <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 8 }}>data (fulfilled payload):</div>
        <div className="data-preview">{state.data ? JSON.stringify(state.data, null, 2) : '—'}</div>
        <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 8 }}>error (rejected payload):</div>
        <div className="data-preview">{state.error ? JSON.stringify(state.error, null, 2) : '—'}</div>

        <h4 style={{ marginTop: 14 }}>fixedCacheKey — shared mutation state</h4>
        <p style={{ fontSize: '.76rem', color: 'var(--text-secondary)', margin: '0 0 6px' }}>
          Обе кнопки используют <code>fixedCacheKey: 'addPost-shared'</code>. Запусти одну — обе
          подписки видят один state (requestId совпадает).
        </p>
        <div className="btn-group">
          <button className="btn" onClick={() => triggerShared({ title: 'A shared', body: 'from A' })}>trigger A (shared)</button>
          <button className="btn" onClick={() => triggerShared({ title: 'B shared', body: 'from B' })}>trigger B (shared)</button>
        </div>
        <div className="trig-mon">
          <div className="trig-mon__row"><span className="trig-mon__key">sharedA.status</span><span className={`trig-mon__val ${sharedA.status}`}>{sharedA.status}</span></div>
          <div className="trig-mon__row"><span className="trig-mon__key">sharedA.data</span><span className="trig-mon__val">{sharedA.data ? JSON.stringify(sharedA.data).slice(0, 50) : '—'}</span></div>
          <div className="trig-mon__row"><span className="trig-mon__key">sharedB.status</span><span className={`trig-mon__val ${sharedB.status}`}>{sharedB.status}</span></div>
          <div className="trig-mon__row"><span className="trig-mon__key">requestId matches?</span><span className="trig-mon__val">{sharedA.requestId === sharedB.requestId ? 'YES — один state' : 'нет'}</span></div>
        </div>
      </div>
    </>
  )
}

function App(): ReactElement {
  return (
    <div className="mut-grid">
      <FormCard />
    </div>
  )
}

// Заменяем placeholder'ы в DOM на React root
useEffectInit()

function useEffectInit(): void {
  const container = document.querySelector<HTMLElement>('.demo-section__body')!
  // Удаляем hard-coded mut-grid из HTML (оставляем параграф) и монтируем React в новый контейнер
  const grids = container.querySelectorAll('.mut-grid')
  grids.forEach((g) => g.remove())
  const reactHost = document.createElement('div')
  container.appendChild(reactHost)

  createRoot(reactHost).render(
    <StrictMode>
      <Provider store={store}>
        <App />
      </Provider>
    </StrictMode>,
  )
}

con.info('1) trigger addPost — смотри isLoading → isSuccess. 2) trigger +fail → isError + error.')
con.info('3) reset() — флаги обнуляются. 4) Две shared-кнопки делят один requestId через fixedCacheKey.')
con.info('5) После успешного addPost — invalidatesTags: [{type:"Post", id:"LIST"}] → список автоматически refetch.')
