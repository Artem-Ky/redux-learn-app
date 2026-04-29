import { configureStore, type SerializedError } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { Provider } from 'react-redux'
import { StrictMode, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface Post { id: number; title: string }
interface NewPost { title: string }

async function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : (input as Request).url
  const method = init?.method ?? 'GET'
  await new Promise(r => setTimeout(r, 250))
  if (method === 'GET' && /\/posts$/.test(url)) {
    return new Response(JSON.stringify([{ id: 1, title: 'typed post 1' }, { id: 2, title: 'typed post 2' }]))
  }
  if (method === 'POST' && /\/posts$/.test(url)) {
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    return new Response(JSON.stringify({ id: 999, title: body.title }), { status: 201 })
  }
  return new Response('{}', { status: 404 })
}

const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://mock.local/', fetchFn: mockFetch as typeof fetch }),
  tagTypes: ['Post'] as const,
  endpoints: (build) => ({
    getPosts: build.query<Post[], void>({
      query: () => 'posts',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Post' as const, id })),
              { type: 'Post' as const, id: 'LIST' },
            ]
          : [{ type: 'Post' as const, id: 'LIST' }],
    }),
    addPost: build.mutation<Post, NewPost>({
      query: (body) => ({ url: 'posts', method: 'POST', body }),
      invalidatesTags: [{ type: 'Post', id: 'LIST' }],
    }),
  }),
})

const { useGetPostsQuery, useAddPostMutation } = api

const store = configureStore({
  reducer: { [api.reducerPath]: api.reducer },
  middleware: (gdm) => gdm().concat(api.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

const con = new ConsolePanel(document.getElementById('console-container')!,
  'Typed RTK Query — все типы корректны без any')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

// Type guard — дискриминация FetchBaseQueryError vs SerializedError
function isFetchBaseQueryError(
  e: FetchBaseQueryError | SerializedError | undefined,
): e is FetchBaseQueryError {
  return e != null && 'status' in e
}

function Demo(): ReactElement {
  const q = useGetPostsQuery()
  const [addPost, addState] = useAddPostMutation()

  return (
    <div>
      <div style={{ padding: 10, background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 4, marginBottom: 10, fontFamily: 'var(--font-mono)', fontSize: '.8rem' }}>
        <strong style={{ color: 'var(--accent-cyan)' }}>Hover по полям ниже в IDE — увидишь типы автоматически:</strong>
        <div style={{ marginTop: 6, color: 'var(--text-secondary)' }}>
          q.data &nbsp;&nbsp; <code style={{ color: 'var(--accent-yellow)' }}>Post[] | undefined</code><br />
          q.error &nbsp; <code style={{ color: 'var(--accent-yellow)' }}>FetchBaseQueryError | SerializedError | undefined</code><br />
          q.isLoading <code style={{ color: 'var(--accent-yellow)' }}>boolean</code><br />
          addPost &nbsp;&nbsp; <code style={{ color: 'var(--accent-yellow)' }}>(arg: NewPost) =&gt; MutationActionCreatorResult</code>
        </div>
      </div>

      <div className="ts-example">
        <h5>useGetPostsQuery() — typed data</h5>
        {q.isLoading
          ? <div style={{ color: 'var(--text-muted)' }}>loading…</div>
          : q.error
          ? (
            <div style={{ color: 'var(--accent-red)', fontFamily: 'var(--font-mono)', fontSize: '.8rem' }}>
              {isFetchBaseQueryError(q.error)
                ? <>FetchBaseQueryError · status={String(q.error.status)}</>
                : <>SerializedError · {q.error?.message}</>
              }
            </div>
          )
          : <div style={{ fontFamily: 'var(--font-mono)', fontSize: '.82rem' }}>
              {q.data?.map(p => (
                <div key={p.id} style={{ padding: '2px 0' }}>
                  <span style={{ color: 'var(--accent-cyan)' }}>#{p.id}</span> · {p.title}
                </div>
              ))}
            </div>
        }
      </div>

      <div className="ts-example">
        <h5>useAddPostMutation() — typed trigger + state</h5>
        <button
          className="btn btn--accent"
          disabled={addState.isLoading}
          onClick={() => {
            // TS: body должен соответствовать NewPost
            const body: NewPost = { title: `typed add @ ${new Date().toLocaleTimeString()}` }
            addPost(body)
              .unwrap()
              .then(p => con.success(`addPost fulfilled · ${JSON.stringify(p)}`))
              .catch(e => con.error(`addPost failed · ${JSON.stringify(e)}`))
          }}
        >
          {addState.isLoading ? 'adding…' : '+ add typed post'}
        </button>
        {addState.data && (
          <div style={{ marginTop: 6, color: 'var(--success)', fontFamily: 'var(--font-mono)', fontSize: '.78rem' }}>
            ✔ Последний: #{addState.data.id} · {addState.data.title}
          </div>
        )}
      </div>

      <div className="ts-example">
        <h5>Selector вне хука — api.endpoints.getPosts.select()</h5>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '.76rem', color: 'var(--text-secondary)' }}>
          const selector = api.endpoints.getPosts.select()<br />
          const result = selector(store.getState())<br />
          // result.data: Post[] | undefined (typed!)<br />
          // result.status: 'uninitialized' | 'pending' | 'fulfilled' | 'rejected'
        </div>
        <div style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: '.76rem', color: 'var(--accent-cyan)' }}>
          result.status = {api.endpoints.getPosts.select()(store.getState()).status}
        </div>
      </div>
    </div>
  )
}

const host = document.getElementById('react-root')!
createRoot(host).render(
  <StrictMode>
    <Provider store={store}>
      <Demo />
    </Provider>
  </StrictMode>,
)

con.info('1. Все типы автоматические: build.query<Post[], void> → хук вернёт data: Post[] | undefined.')
con.info('2. addPost принимает NewPost — попытка передать {foo: 1} вызовет TS ошибку.')
con.info('3. tagTypes as const → providesTags с type: "Post" as const валидно.')
