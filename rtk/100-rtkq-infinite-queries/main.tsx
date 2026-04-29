import { configureStore } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { Provider } from 'react-redux'
import { StrictMode, useState, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface Post { id: number; page: number; title: string; body: string }

async function mockFetch(input: RequestInfo | URL): Promise<Response> {
  const url = typeof input === 'string' ? input : (input as Request).url
  await new Promise(r => setTimeout(r, 500))
  const m = /\/feed\?page=(\d+)/.exec(url)
  const page = m ? Number(m[1]) : 1
  const MAX_PAGES = 5
  if (page > MAX_PAGES) {
    return new Response(JSON.stringify([]), { status: 200 })
  }
  const items: Post[] = Array.from({ length: 3 }, (_, i) => ({
    id: (page - 1) * 3 + i + 1,
    page,
    title: `Пост №${(page - 1) * 3 + i + 1}`,
    body: `Содержимое поста на странице ${page}, позиция ${i + 1}`,
  }))
  return new Response(JSON.stringify(items), { status: 200 })
}

type FeedResponse = Post[]
type PageParam = number

// Ручной infinite query через serializeQueryArgs + merge + forceRefetch
// (это под капотом build.infiniteQuery; работает на старых версиях RTK)
const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://mock.local/', fetchFn: mockFetch as typeof fetch }),
  endpoints: (build) => ({
    getFeed: build.query<{ pages: FeedResponse[]; pageParams: PageParam[]; hasNext: boolean }, { page: number }>({
      query: ({ page }) => `feed?page=${page}`,
      // одна entry на все страницы
      serializeQueryArgs: ({ endpointName }) => endpointName,
      // мерджим новую страницу к pages[]
      transformResponse: (response: FeedResponse, _meta, arg) => ({
        pages: [response],
        pageParams: [arg.page],
        hasNext: response.length > 0,
      }),
      merge: (current, incoming, { arg }) => {
        // incoming содержит одну новую страницу
        if (current.pageParams.includes(arg.page)) return
        current.pages.push(...incoming.pages)
        current.pageParams.push(arg.page)
        current.hasNext = incoming.pages[0].length > 0
      },
      // forceRefetch при смене arg.page (иначе cache HIT → merge не сработает)
      forceRefetch: ({ currentArg, previousArg }) => currentArg?.page !== previousArg?.page,
    }),
  }),
})

const { useGetFeedQuery } = api

const store = configureStore({
  reducer: { [api.reducerPath]: api.reducer },
  middleware: (gdm) => gdm().concat(api.middleware),
})

const con = new ConsolePanel(document.getElementById('console-container')!,
  'Infinite queries — одна entry, массив pages')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

function Feed(): ReactElement {
  const [currentPage, setCurrentPage] = useState(1)
  const q = useGetFeedQuery({ page: currentPage })

  const fetchNext = (): void => {
    if (!q.data?.hasNext) {
      con.warn('hasNext=false → страниц больше нет')
      return
    }
    setCurrentPage(p => p + 1)
    con.info(`fetchNextPage → page=${currentPage + 1}`)
  }

  const reset = (): void => {
    store.dispatch(api.util.resetApiState())
    setCurrentPage(1)
    con.warn('resetApiState — все страницы сброшены')
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
        <button className="btn btn--accent" onClick={fetchNext} disabled={q.isFetching || !q.data?.hasNext}>
          {q.isFetching ? 'загружается…' : 'fetchNextPage ↓'}
        </button>
        <button className="btn btn--danger" onClick={reset}>reset</button>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '.78rem', color: 'var(--text-muted)' }}>
          загружено страниц: <strong style={{ color: 'var(--accent-cyan)' }}>{q.data?.pages.length ?? 0}</strong>
          {' · '}hasNext: <strong style={{ color: q.data?.hasNext ? 'var(--success)' : 'var(--accent-red)' }}>
            {String(q.data?.hasNext ?? false)}
          </strong>
        </span>
      </div>

      <div className="feed">
        {q.data?.pages.map((page, pi) => (
          <div key={q.data!.pageParams[pi]}>
            <div className="page-sep">── page {q.data!.pageParams[pi]} ──</div>
            {page.map(post => (
              <div key={post.id} className="feed-item">
                <div className="feed-item__pg">page={post.page} · id={post.id}</div>
                <strong>{post.title}</strong>
                <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{post.body}</div>
              </div>
            ))}
          </div>
        ))}
        {q.isLoading && <div style={{ padding: 10, color: 'var(--text-muted)' }}>первая загрузка…</div>}
      </div>

      <div className="cache-snap">
        <h5 style={{ color: 'var(--accent-cyan)', fontSize: '.82rem', margin: '0 0 6px' }}>
          state.api.queries['getFeed({'{"page":1}'})'].data
        </h5>
        <pre style={{ margin: 0, fontSize: '.74rem', color: 'var(--text-secondary)' }}>
          {q.data ? JSON.stringify({
            pageParams: q.data.pageParams,
            pages_sizes: q.data.pages.map(p => p.length),
            hasNext: q.data.hasNext,
          }, null, 2) : 'нет данных'}
        </pre>
        <p style={{ marginTop: 6, fontSize: '.72rem', color: 'var(--text-muted)' }}>
          Одна cache entry. Все страницы мерджатся через <code>merge</code> в <code>pages[]</code>.
          <code>serializeQueryArgs: endpointName</code> — значит один ключ для всех аргументов.
        </p>
      </div>
    </div>
  )
}

const host = document.getElementById('react-root')!
createRoot(host).render(
  <StrictMode>
    <Provider store={store}>
      <Feed />
    </Provider>
  </StrictMode>,
)

con.info('1. При mount → первая страница (page=1) в cache.')
con.info('2. Жми "fetchNextPage" → новая страница МЕРДЖИТСЯ в ту же entry (pages.push).')
con.info('3. После 5 страниц сервер возвращает [] → hasNext=false → кнопка disabled.')
con.info('4. Reset — entry удалена, всё с начала.')
