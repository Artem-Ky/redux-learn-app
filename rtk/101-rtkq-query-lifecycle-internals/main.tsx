import { configureStore } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { Provider } from 'react-redux'
import { StrictMode, useEffect, useState, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface Item { id: number; value: string }

async function mockFetch(input: RequestInfo | URL): Promise<Response> {
  const url = typeof input === 'string' ? input : (input as Request).url
  con.action({ type: '[stage 4] baseQuery(fetch)' }, 'pipeline')
  trace('baseQuery')
  await new Promise(r => setTimeout(r, 400))
  if (/\/items\/(\d+)/.test(url)) {
    const id = Number(url.match(/\/items\/(\d+)/)![1])
    return new Response(JSON.stringify({ id, value: `item #${id}` }), { status: 200 })
  }
  return new Response('{}', { status: 404 })
}

type Stage = 'init' | 'subscribe' | 'pending' | 'baseQuery' | 'transform' | 'fulfilled' | 'selector'
const STAGES: Array<{ key: Stage; name: string; hint: string }> = [
  { key: 'init',       name: '1. useGetXQuery mount',        hint: 'serializeQueryArgs → cacheKey; dispatch(initiate)' },
  { key: 'subscribe',  name: '2. initiate — decision',       hint: 'fetch vs cache; subscribe ++refCount' },
  { key: 'pending',    name: '3. queryThunk.pending',         hint: 'state.queries[key] = {status:pending}' },
  { key: 'baseQuery',  name: '4. baseQuery call',             hint: 'fetchBaseQuery — сеть' },
  { key: 'transform',  name: '5. transformResponse',          hint: 'если есть — применяется здесь' },
  { key: 'fulfilled',  name: '6. queryThunk.fulfilled',       hint: 'state.queries[key].data = payload; провайды' },
  { key: 'selector',   name: '7. useQuery selector re-eval',  hint: 'shallowEqual → ререндер (если изменилось)' },
]

const stageTimes = new Map<Stage, number>()
const stageOrder: Stage[] = []
let pipelineStart = 0
let onUpdateFn: (() => void) | null = null

function trace(stage: Stage): void {
  stageOrder.push(stage)
  stageTimes.set(stage, Date.now() - pipelineStart)
  onUpdateFn?.()
}

const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://mock.local/', fetchFn: mockFetch as typeof fetch }),
  endpoints: (build) => ({
    getItem: build.query<Item, number>({
      query: (id) => `items/${id}`,
      transformResponse: (r: Item) => {
        con.action({ type: '[stage 5] transformResponse' }, 'pipeline')
        trace('transform')
        return { ...r, value: r.value.toUpperCase() }
      },
      async onQueryStarted(arg, { queryFulfilled }) {
        trace('pending')
        con.action({ type: `[stage 3] queryThunk.pending · arg=${arg}` }, 'pipeline')
        try {
          await queryFulfilled
          trace('fulfilled')
          con.action({ type: '[stage 6] queryThunk.fulfilled · data → cache' }, 'pipeline')
          setTimeout(() => {
            trace('selector')
            con.action({ type: '[stage 7] selector re-eval → ререндер' }, 'pipeline')
          }, 20)
        } catch {
          con.error('[stage 6] queryThunk.rejected')
        }
      },
    }),
  }),
})

const { useGetItemQuery } = api

const store = configureStore({
  reducer: { [api.reducerPath]: api.reducer },
  middleware: (gdm) => gdm().concat(api.middleware),
})

const con = new ConsolePanel(document.getElementById('console-container')!,
  'Pipeline — 7 стадий от hook до data')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

function Tracer({ tick }: { tick: number }): ReactElement {
  const [, force] = useState(0)
  useEffect(() => {
    onUpdateFn = () => force(n => n + 1)
    return () => { onUpdateFn = null }
  }, [])

  const q = useGetItemQuery(tick)
  useEffect(() => {
    if (tick > 0) {
      trace('init')
      con.action({ type: `[stage 1] useGetItemQuery(${tick}) mount` }, 'pipeline')
      setTimeout(() => {
        trace('subscribe')
        con.action({ type: `[stage 2] initiate → decision: ${q.isLoading ? 'fetch' : 'cache HIT'}, subscribe` }, 'pipeline')
      }, 5)
    }
  }, [tick])

  return (
    <div>
      {STAGES.map(s => {
        const t = stageTimes.get(s.key)
        const isDone = stageOrder.includes(s.key)
        const isLast = stageOrder[stageOrder.length - 1] === s.key
        return (
          <div key={s.key} className={`pipeline-stage ${isLast ? 'active' : isDone ? 'done' : ''}`}>
            <span className="pipeline-stage__n">{isDone ? '✔' : '·'}</span>
            <div>
              <div className="pipeline-stage__name">{s.name}</div>
              <div className="pipeline-stage__hint">{s.hint}</div>
            </div>
            <span className="pipeline-stage__time">
              {t !== undefined ? `+${t}ms` : '—'}
            </span>
          </div>
        )
      })}
      <div style={{ marginTop: 12, padding: 10, background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 4 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '.82rem', color: 'var(--accent-cyan)' }}>
          data: {q.data ? JSON.stringify(q.data) : 'undefined'}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '.74rem', color: 'var(--text-muted)', marginTop: 4 }}>
          isFetching={String(q.isFetching)} · isSuccess={String(q.isSuccess)} · status={q.status}
        </div>
      </div>
    </div>
  )
}

function App(): ReactElement {
  const [tick, setTick] = useState(0)
  const runOnce = (): void => {
    stageOrder.length = 0
    stageTimes.clear()
    pipelineStart = Date.now()
    con.info('── RESET pipeline ──')
    setTick(t => t + 1)
  }
  return (
    <div>
      <div className="tick-bar">
        <button className="btn btn--accent" onClick={runOnce}>▶ старт pipeline (useGetItemQuery(id=новый))</button>
        <button className="btn" onClick={() => {
          stageOrder.length = 0; stageTimes.clear(); pipelineStart = Date.now()
          setTick(tick + 0) // не меняем arg — должен быть cache HIT
          setTimeout(() => setTick(t => t), 10)
          con.info('── повторный useGetItemQuery того же id — должен быть HIT без fetch ──')
        }}>▶ re-mount same id (HIT)</button>
      </div>
      <Tracer tick={tick} />
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

con.info('1. Жми "старт" — arg меняется → MISS → все 7 стадий отработают с временами.')
con.info('2. Жми снова "старт" — id=2 → MISS (новый cacheKey) → все 7 стадий.')
con.info('3. "re-mount same id" — последний id → HIT → пропускаются стадии 4-6 (нет сети).')
