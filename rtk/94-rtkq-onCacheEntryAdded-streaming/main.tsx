import { configureStore } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { Provider } from 'react-redux'
import { StrictMode, useEffect, useRef, useState, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface Message { id: number; user: string; text: string; ts: number }

// ── мок WebSocket на EventTarget ────────────────────────────────────
class MockWebSocket extends EventTarget {
  readyState: 0 | 1 | 2 | 3 = 0
  private intervalId: ReturnType<typeof setInterval> | null = null
  private closed = false

  constructor(_url: string) {
    super()
    setTimeout(() => {
      if (this.closed) return
      this.readyState = 1
      this.dispatchEvent(new Event('open'))
      this.startStream()
    }, 80)
  }

  private startStream(): void {
    let counter = 100
    const SERVER_USERS = ['alice', 'bob', 'carol', 'server-bot']
    const SERVER_MSGS = [
      'привет чат',
      'кто онлайн?',
      'RTKQ streaming работает',
      'это через onCacheEntryAdded',
      'WebSocket идёт в Immer draft',
      'updateCachedData((draft) => draft.push(msg))',
    ]
    this.intervalId = setInterval(() => {
      if (this.closed || this.readyState !== 1) return
      const msg: Message = {
        id: ++counter,
        user: SERVER_USERS[Math.floor(Math.random() * SERVER_USERS.length)],
        text: SERVER_MSGS[Math.floor(Math.random() * SERVER_MSGS.length)],
        ts: Date.now(),
      }
      this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(msg) }))
    }, 2200)
  }

  send(data: string): void {
    // локальный echo — mock сервер просто ретранслирует мне же
    setTimeout(() => {
      if (this.closed) return
      this.dispatchEvent(new MessageEvent('message', { data }))
    }, 40)
  }

  close(): void {
    this.closed = true
    this.readyState = 3
    if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null }
    this.dispatchEvent(new Event('close'))
  }
}

let currentWs: MockWebSocket | null = null

// ── mock HTTP для initial fetch ───────────────────────────────────
async function mockFetch(_input: RequestInfo | URL): Promise<Response> {
  await new Promise(r => setTimeout(r, 300))
  const history: Message[] = [
    { id: 1, user: 'alice',  text: 'всем привет — это история чата', ts: Date.now() - 60000 },
    { id: 2, user: 'bob',    text: 'загружено через initial GET /messages', ts: Date.now() - 50000 },
    { id: 3, user: 'carol',  text: 'дальше всё через WS push', ts: Date.now() - 40000 },
  ]
  return new Response(JSON.stringify(history), { status: 200, headers: { 'content-type': 'application/json' } })
}

const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://mock.local/', fetchFn: mockFetch as typeof fetch }),
  endpoints: (build) => ({
    getMessages: build.query<Message[], void>({
      query: () => 'messages',
      async onCacheEntryAdded(_arg, { updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
        con.action({ type: 'onCacheEntryAdded — открываем WS' }, 'stream')
        const ws = new MockWebSocket('wss://mock.local/chat')
        currentWs = ws

        const onOpen = (): void => con.success('WS open')
        const onMessage = (e: Event): void => {
          const ev = e as MessageEvent
          try {
            const msg: Message = JSON.parse(ev.data)
            updateCachedData((draft) => {
              if (!draft.find(m => m.id === msg.id)) draft.push(msg)
            })
            con.info(`◂ WS msg · ${msg.user}: "${msg.text.slice(0, 30)}..."`)
          } catch { /* noop */ }
        }
        const onClose = (): void => con.warn('WS closed')

        ws.addEventListener('open', onOpen)
        ws.addEventListener('message', onMessage)
        ws.addEventListener('close', onClose)

        try {
          await cacheDataLoaded
          con.success('cacheDataLoaded → initial history уже в cache')
        } catch {
          con.error('cacheDataLoaded rejected')
        }

        await cacheEntryRemoved
        con.warn('cacheEntryRemoved → закрываем WS (cleanup)')
        ws.removeEventListener('open', onOpen)
        ws.removeEventListener('message', onMessage)
        ws.removeEventListener('close', onClose)
        ws.close()
        currentWs = null
      },
    }),
  }),
})

const { useGetMessagesQuery } = api

const store = configureStore({
  reducer: { [api.reducerPath]: api.reducer },
  middleware: (gdm) => gdm().concat(api.middleware),
})

const con = new ConsolePanel(document.getElementById('console-container')!,
  'Streaming — смотри события WS и обновления cached data')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

function Chat(): ReactElement {
  const q = useGetMessagesQuery()
  const [draft, setDraft] = useState('')
  const [wsOpen, setWsOpen] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  // Скроллим ТОЛЬКО внутри .chat контейнера, не пробиваясь к окну.
  // И только если пользователь уже был у дна (autoscroll-on-tail UX).
  useEffect(() => {
    const el = chatRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distanceFromBottom < 80) {
      el.scrollTop = el.scrollHeight
    }
  }, [q.data?.length])

  useEffect(() => {
    const i = setInterval(() => setWsOpen(currentWs?.readyState === 1), 400)
    return () => clearInterval(i)
  }, [])

  const send = (): void => {
    if (!draft.trim() || !currentWs) return
    const msg: Message = { id: Date.now(), user: 'me', text: draft, ts: Date.now() }
    currentWs.send(JSON.stringify(msg))
    setDraft('')
  }

  return (
    <div>
      <div className="ws-status">
        <span className={`ws-indicator ${wsOpen ? 'open' : ''}`} />
        <span>WebSocket: <strong style={{ color: wsOpen ? 'var(--success)' : 'var(--text-muted)' }}>
          {wsOpen ? 'OPEN' : 'CLOSED'}</strong></span>
        <span>·</span>
        <span>сообщений в cache: <strong style={{ color: 'var(--accent-cyan)' }}>{q.data?.length ?? 0}</strong></span>
        <span>·</span>
        <span>cacheKey: <code>getMessages(undefined)</code></span>
      </div>

      <div className="chat" ref={chatRef}>
        {q.isLoading && <div style={{ color: 'var(--text-muted)' }}>загружается история…</div>}
        {q.data?.map(m => (
          <div key={m.id} className={`msg ${m.user === 'me' ? 'me' : 'server'}`}>
            <div className="msg__head">
              <span className="msg__user">{m.user}</span>
              <span>{new Date(m.ts).toLocaleTimeString()}</span>
            </div>
            <div>{m.text}</div>
          </div>
        ))}
      </div>

      <div className="send-bar">
        <input
          type="text"
          placeholder="написать сообщение…"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
        />
        <button className="btn btn--accent" onClick={send}>отправить</button>
      </div>

      <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: 10 }}>
        <strong>Трюк:</strong> отмонтируй и смонтируй компонент обратно (F5) — смотри как
        onCacheEntryAdded вызывается заново, старая entry была удалена через keepUnusedDataFor.
      </p>
    </div>
  )
}

const host = document.getElementById('react-root')!
createRoot(host).render(
  <StrictMode>
    <Provider store={store}>
      <Chat />
    </Provider>
  </StrictMode>,
)

con.info('1. Mount → onCacheEntryAdded → new WebSocket() → await cacheDataLoaded.')
con.info('2. Каждые 2s сервер шлёт сообщение → ws.onmessage → updateCachedData → cache обновлён.')
con.info('3. F5 страницы = unmount → последний подписчик отвалился → keepUnusedDataFor=60s → потом cacheEntryRemoved → ws.close().')
