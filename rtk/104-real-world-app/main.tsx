import { configureStore, createSlice, createListenerMiddleware, isAnyOf, type PayloadAction } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { Provider, useDispatch, useSelector } from 'react-redux'
import { StrictMode, useMemo, useState, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface Book { id: number; title: string; author: string; year: number }

// ── server ──────────────────────────────────────────────────────────
let serverBooks: Book[] = [
  { id: 1, title: 'Clean Code', author: 'R. Martin', year: 2008 },
  { id: 2, title: 'Refactoring', author: 'M. Fowler', year: 1999 },
  { id: 3, title: 'The Pragmatic Programmer', author: 'D. Thomas', year: 1999 },
  { id: 4, title: 'You Don\'t Know JS', author: 'K. Simpson', year: 2015 },
]
let nextId = 5

async function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : (input as Request).url
  const method = init?.method ?? 'GET'
  await new Promise(r => setTimeout(r, 300))

  if (method === 'GET' && /\/books$/.test(url)) {
    return new Response(JSON.stringify(serverBooks), { status: 200 })
  }
  const idMatch = /\/books\/(\d+)$/.exec(url)
  if (method === 'POST' && /\/books$/.test(url)) {
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    const book: Book = { id: nextId++, title: String(body.title ?? ''), author: String(body.author ?? ''), year: Number(body.year ?? new Date().getFullYear()) }
    serverBooks = [...serverBooks, book]
    return new Response(JSON.stringify(book), { status: 201 })
  }
  if (method === 'PATCH' && idMatch) {
    const id = Number(idMatch[1])
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    const i = serverBooks.findIndex(b => b.id === id)
    if (i === -1) return new Response('{}', { status: 404 })
    serverBooks[i] = { ...serverBooks[i], ...body }
    return new Response(JSON.stringify(serverBooks[i]), { status: 200 })
  }
  if (method === 'DELETE' && idMatch) {
    const id = Number(idMatch[1])
    serverBooks = serverBooks.filter(b => b.id !== id)
    return new Response('{}', { status: 204 })
  }
  return new Response('{}', { status: 404 })
}

// ── RTKQ ────────────────────────────────────────────────────────────
const booksApi = createApi({
  reducerPath: 'booksApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://mock.local/', fetchFn: mockFetch as typeof fetch }),
  tagTypes: ['Book'],
  endpoints: (build) => ({
    getBooks: build.query<Book[], void>({
      query: () => 'books',
      providesTags: (r) => r
        ? [...r.map(b => ({ type: 'Book' as const, id: b.id })), { type: 'Book' as const, id: 'LIST' }]
        : [{ type: 'Book' as const, id: 'LIST' }],
    }),
    addBook: build.mutation<Book, Omit<Book, 'id'>>({
      query: (body) => ({ url: 'books', method: 'POST', body }),
      invalidatesTags: [{ type: 'Book', id: 'LIST' }],
    }),
    updateBook: build.mutation<Book, { id: number; patch: Partial<Book> }>({
      query: ({ id, patch }) => ({ url: `books/${id}`, method: 'PATCH', body: patch }),
      async onQueryStarted({ id, patch }, { dispatch, queryFulfilled }) {
        const r = dispatch(booksApi.util.updateQueryData('getBooks', undefined, (draft) => {
          const b = draft.find(x => x.id === id)
          if (b) Object.assign(b, patch)
        }))
        try { await queryFulfilled } catch { r.undo() }
      },
      invalidatesTags: (_r, _e, arg) => [{ type: 'Book', id: arg.id }],
    }),
    deleteBook: build.mutation<void, number>({
      query: (id) => ({ url: `books/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => [{ type: 'Book', id }, { type: 'Book', id: 'LIST' }],
    }),
  }),
})

// ── UI slice ────────────────────────────────────────────────────────
const uiSlice = createSlice({
  name: 'ui',
  initialState: { selectedId: null as number | null, search: '' },
  reducers: {
    select: (s, a: PayloadAction<number | null>) => { s.selectedId = a.payload },
    setSearch: (s, a: PayloadAction<string>) => { s.search = a.payload },
  },
})

// ── listenerMiddleware для analytics ─────────────────────────────────
const listener = createListenerMiddleware()
listener.startListening({
  matcher: isAnyOf(
    booksApi.endpoints.addBook.matchFulfilled,
    booksApi.endpoints.updateBook.matchFulfilled,
    booksApi.endpoints.deleteBook.matchFulfilled,
  ),
  effect: (action) => {
    const kind = action.type.replace('/fulfilled', '').split('/').pop()
    con.action({ type: `📊 analytics.track('${kind}')`, payload: action.payload }, 'analytics')
  },
})

// ── store ───────────────────────────────────────────────────────────
const store = configureStore({
  reducer: {
    [booksApi.reducerPath]: booksApi.reducer,
    ui: uiSlice.reducer,
  },
  middleware: (gdm) => gdm().prepend(listener.middleware).concat(booksApi.middleware),
})

type RootState = ReturnType<typeof store.getState>

const con = new ConsolePanel(document.getElementById('console-container')!,
  'Real-world · RTKQ + slice + listener в одной композиции')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

// ── components ──────────────────────────────────────────────────────
function BooksList(): ReactElement {
  const q = booksApi.useGetBooksQuery()
  const [deleteBook] = booksApi.useDeleteBookMutation()
  const [updateBook] = booksApi.useUpdateBookMutation()
  const dispatch = useDispatch()
  const selectedId = useSelector((s: RootState) => s.ui.selectedId)
  const search = useSelector((s: RootState) => s.ui.search)

  // memoized filter — зависит от data + search
  const filtered = useMemo(() => {
    if (!q.data) return []
    if (!search) return q.data
    const lo = search.toLowerCase()
    return q.data.filter(b => b.title.toLowerCase().includes(lo) || b.author.toLowerCase().includes(lo))
  }, [q.data, search])

  return (
    <div className="app-panel">
      <h5 style={{ color: 'var(--accent-cyan)', fontSize: '.85rem', margin: '0 0 6px' }}>
        Books ({filtered.length} из {q.data?.length ?? 0})
      </h5>
      <div className="filter-bar">
        <span style={{ color: 'var(--text-muted)' }}>🔍</span>
        <input
          placeholder="по title / author"
          value={search}
          onChange={e => dispatch(uiSlice.actions.setSearch(e.target.value))}
        />
      </div>
      {q.isLoading && <div style={{ color: 'var(--text-muted)' }}>загрузка…</div>}
      {filtered.map(b => (
        <div
          key={b.id}
          className={`book-row ${b.id === selectedId ? 'selected' : ''}`}
          onClick={() => dispatch(uiSlice.actions.select(b.id === selectedId ? null : b.id))}
        >
          <span className="book-row__id">#{b.id}</span>
          <div>
            <div className="book-row__title">{b.title}</div>
            <div className="book-row__author">{b.author}</div>
          </div>
          <span className="book-row__author">{b.year}</span>
          <span className="book-row__actions">
            <button className="btn" style={{ padding: '2px 6px', fontSize: '.7rem' }} onClick={e => {
              e.stopPropagation()
              const newTitle = window.prompt('новый title', b.title)
              if (newTitle) updateBook({ id: b.id, patch: { title: newTitle } })
            }}>edit</button>
            <button className="btn btn--danger" style={{ padding: '2px 6px', fontSize: '.7rem' }} onClick={e => {
              e.stopPropagation()
              if (window.confirm(`Удалить "${b.title}"?`)) deleteBook(b.id)
            }}>del</button>
          </span>
        </div>
      ))}
    </div>
  )
}

function BookAdd(): ReactElement {
  const [addBook, state] = booksApi.useAddBookMutation()
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')

  const onAdd = (): void => {
    if (!title || !author) return
    addBook({ title, author, year: new Date().getFullYear() })
      .unwrap()
      .then(() => { setTitle(''); setAuthor('') })
  }

  return (
    <div className="book-form">
      <input placeholder="title" value={title} onChange={e => setTitle(e.target.value)} />
      <input placeholder="author" value={author} onChange={e => setAuthor(e.target.value)} />
      <button className="btn btn--accent" onClick={onAdd} disabled={state.isLoading || !title || !author}>
        {state.isLoading ? '…' : '+ add'}
      </button>
    </div>
  )
}

function BookDetail(): ReactElement {
  const selectedId = useSelector((s: RootState) => s.ui.selectedId)
  const q = booksApi.useGetBooksQuery(undefined, {
    selectFromResult: ({ data }) => ({ book: data?.find(b => b.id === selectedId) }),
  })

  if (!selectedId) return <div className="app-panel"><div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Выбери книгу слева</div></div>
  if (!q.book) return <div className="app-panel"><div style={{ color: 'var(--text-muted)' }}>Книга не найдена</div></div>

  return (
    <div className="app-panel">
      <h5 style={{ color: 'var(--accent-cyan)', fontSize: '.85rem', margin: '0 0 6px' }}>
        Detail · #{q.book.id}
      </h5>
      <div className="detail-card">
        <div><strong style={{ color: 'var(--text-bright)' }}>Title:</strong> {q.book.title}</div>
        <div><strong style={{ color: 'var(--text-bright)' }}>Author:</strong> {q.book.author}</div>
        <div><strong style={{ color: 'var(--text-bright)' }}>Year:</strong> {q.book.year}</div>
      </div>
      <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 8 }}>
        selectFromResult делает так, что этот компонент не ререндерится при любом изменении
        списка — только при смене <em>выбранной</em> книги.
      </p>
    </div>
  )
}

function App(): ReactElement {
  return (
    <div>
      <BookAdd />
      <div className="app-grid">
        <BooksList />
        <BookDetail />
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

con.info('1. Жми + add — mutation → invalidatesTags LIST → getBooks рефетч → listener выводит analytics.')
con.info('2. Кликай на книгу — select в ui slice, detail использует selectFromResult (не ререндерит список).')
con.info('3. Пиши в поиск — фильтр через useMemo, сервер не трогается.')
con.info('4. edit — optimistic update, data мгновенно обновляется, потом сервер.')
