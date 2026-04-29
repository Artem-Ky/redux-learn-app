import { configureStore } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { Provider } from 'react-redux'
import { StrictMode, useState, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface Post { id: number; page: number; title: string }

async function mockFetch(input: RequestInfo | URL): Promise<Response> {
  const url = typeof input === 'string' ? input : (input as Request).url
  await new Promise(r => setTimeout(r, 700))
  const m = /\/posts\?page=(\d+)/.exec(url)
  const page = m ? Number(m[1]) : 1
  const posts: Post[] = Array.from({ length: 5 }, (_, i) => ({
    id: (page - 1) * 5 + i + 1,
    page,
    title: `Пост №${(page - 1) * 5 + i + 1} (страница ${page})`,
  }))
  return new Response(JSON.stringify(posts), { status: 200 })
}

const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://mock.local/', fetchFn: mockFetch as typeof fetch }),
  endpoints: (build) => ({
    getPosts: build.query<Post[], { page: number }>({
      query: ({ page }) => `posts?page=${page}`,
    }),
  }),
})

const { useGetPostsQuery } = api

const store = configureStore({
  reducer: { [api.reducerPath]: api.reducer },
  middleware: (gdm) => gdm().concat(api.middleware),
})

const con = new ConsolePanel(document.getElementById('console-container')!,
  'data vs currentData — жми стрелки, смотри разницу')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

function Demo(): ReactElement {
  const [page, setPage] = useState(1)
  const q = useGetPostsQuery({ page })

  const flag = (b: boolean): string => b ? 'true' : 'false'
  const cls = (b: boolean): string => b ? 'true' : 'false'

  return (
    <div>
      <div className="pager">
        <button className="btn" onClick={() => setPage(p => Math.max(1, p - 1))}>← prev</button>
        <span>page = <strong style={{ color: 'var(--accent-cyan)' }}>{page}</strong></span>
        <button className="btn" onClick={() => setPage(p => p + 1)}>next →</button>
        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
          cacheKey: getPosts({'{'}"page":{page}{'}'})
        </span>
      </div>

      <div className="flag-grid">
        <div className="flag-box">
          <h5>Флаги состояния</h5>
          <div className="flag-line"><span className="flag-line__key">isUninitialized</span><span className={`flag-line__val ${cls(q.isUninitialized)}`}>{flag(q.isUninitialized)}</span></div>
          <div className="flag-line"><span className="flag-line__key">isLoading (ПЕРВЫЙ fetch)</span><span className={`flag-line__val ${cls(q.isLoading)}`}>{flag(q.isLoading)}</span></div>
          <div className="flag-line"><span className="flag-line__key">isFetching (любой fetch)</span><span className={`flag-line__val ${cls(q.isFetching)}`}>{flag(q.isFetching)}</span></div>
          <div className="flag-line"><span className="flag-line__key">isSuccess</span><span className={`flag-line__val ${cls(q.isSuccess)}`}>{flag(q.isSuccess)}</span></div>
          <div className="flag-line"><span className="flag-line__key">isError</span><span className={`flag-line__val ${cls(q.isError)}`}>{flag(q.isError)}</span></div>
          <div className="flag-line"><span className="flag-line__key">status</span><span className="flag-line__val">{q.status}</span></div>
        </div>
        <div className="flag-box">
          <h5>data vs currentData</h5>
          <div className="flag-line">
            <span className="flag-line__key">data (любой arg)</span>
            <span className="flag-line__val">
              {q.data ? `[${q.data.length}] стр. ${q.data[0]?.page}` : 'undefined'}
            </span>
          </div>
          <div className="flag-line">
            <span className="flag-line__key">currentData (для page={page})</span>
            <span className="flag-line__val">
              {q.currentData ? `[${q.currentData.length}] стр. ${q.currentData[0]?.page}` : 'undefined'}
            </span>
          </div>
          <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginTop: 6 }}>
            В момент смены страницы data остаётся от предыдущей; currentData — undefined пока fulfilled.
          </div>
        </div>
      </div>

      <div className={`post-card ${q.isFetching ? 'fetching' : ''}`}>
        <h5 style={{ color: 'var(--accent-cyan)', fontSize: '.82rem', margin: '0 0 8px' }}>
          UX A · через <code>data</code> (виден "призрак" прошлой страницы пока грузится)
        </h5>
        <div style={{ opacity: q.isFetching ? 0.4 : 1, transition: 'opacity 200ms' }}>
          {q.data?.map(p => (
            <div key={p.id} style={{ padding: '3px 0', fontFamily: 'var(--font-mono)', fontSize: '.78rem' }}>
              <span style={{ color: 'var(--accent-cyan)' }}>#{p.id}</span> · {p.title}
            </div>
          ))}
        </div>
      </div>

      <div className={`post-card ${q.isFetching ? 'fetching' : ''}`} style={{ marginTop: 10 }}>
        <h5 style={{ color: 'var(--accent-cyan)', fontSize: '.82rem', margin: '0 0 8px' }}>
          UX B · через <code>currentData</code> (чистое — скелетон пока нет данных для текущего arg)
        </h5>
        {q.currentData
          ? q.currentData.map(p => (
            <div key={p.id} style={{ padding: '3px 0', fontFamily: 'var(--font-mono)', fontSize: '.78rem' }}>
              <span style={{ color: 'var(--accent-cyan)' }}>#{p.id}</span> · {p.title}
            </div>
          ))
          : (
            <>
              <div style={{ height: 14, background: 'var(--bg-tertiary)', borderRadius: 3, marginBottom: 4, animation: 'pulse 1.2s infinite' }} />
              <div style={{ height: 14, background: 'var(--bg-tertiary)', borderRadius: 3, marginBottom: 4, width: '85%' }} />
              <div style={{ height: 14, background: 'var(--bg-tertiary)', borderRadius: 3, marginBottom: 4, width: '90%' }} />
            </>
          )
        }
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

con.info('1. Жми "next" → на 700ms смотри: data показывает прошлую страницу, currentData=undefined, isFetching=true.')
con.info('2. Вернись на уже посещённую страницу — isFetching=false, данные сразу из cache. isLoading никогда не true после первого успеха.')
con.info('3. UX A держит "призрак" — плавнее. UX B чистый, но мигание скелетона при каждой смене.')
