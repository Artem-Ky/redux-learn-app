import { configureStore } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery, skipToken } from '@reduxjs/toolkit/query/react'
import { Provider } from 'react-redux'
import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── mock network ──────────────────────────────────────────────────
interface PokemonDto { id: number; name: string; hp: number }
const POKEDEX: Record<string, PokemonDto> = {
  pikachu:   { id: 25, name: 'pikachu',   hp: 35 },
  charizard: { id: 6,  name: 'charizard', hp: 78 },
  bulbasaur: { id: 1,  name: 'bulbasaur', hp: 45 },
  mewtwo:    { id: 150, name: 'mewtwo',   hp: 106 },
}
async function mockFetch(input: RequestInfo | URL): Promise<Response> {
  const url = typeof input === 'string' ? input : (input as Request).url ?? String(input)
  await new Promise((r) => setTimeout(r, 500))
  const name = url.split('pokemon/')[1]?.split('?')[0]?.split('/')[0] ?? ''
  if (!POKEDEX[name]) return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
  return new Response(JSON.stringify(POKEDEX[name]), { status: 200, headers: { 'content-type': 'application/json' } })
}

// ── api ───────────────────────────────────────────────────────────
const pokeApi = createApi({
  reducerPath: 'pokeApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://pokeapi.co/api/v2/', fetchFn: mockFetch as typeof fetch }),
  endpoints: (build) => ({
    getPokemonByName: build.query<PokemonDto, string>({ query: (name) => `pokemon/${name}` }),
  }),
})
const { useGetPokemonByNameQuery } = pokeApi

// ── store ─────────────────────────────────────────────────────────
const store = configureStore({
  reducer: { [pokeApi.reducerPath]: pokeApi.reducer },
  middleware: (gdm) => gdm().concat(pokeApi.middleware),
})

// ── panels ────────────────────────────────────────────────────────
const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог useQuery — смотри рендеры и phase transitions')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

// ── React component ──────────────────────────────────────────────
interface HistoryEntry {
  t: number
  arg: string
  status: string
  isLoading: boolean
  isFetching: boolean
}

function flag(val: boolean, errorTone = false): string {
  return val ? (errorTone ? 'e' : 't') : 'f'
}

function formatStamp(stamp: number | undefined): string {
  if (!stamp) return '—'
  const d = new Date(stamp)
  return `${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`
}

function App(): JSX.Element {
  const [name, setName] = useState<string>('pikachu')
  const [active, setActive] = useState<boolean>(true)
  const renderRef = useRef<number>(0)
  const historyRef = useRef<HistoryEntry[]>([])
  renderRef.current += 1

  const arg = active ? name : skipToken
  const q = useGetPokemonByNameQuery(arg)

  useEffect(() => {
    historyRef.current = [
      { t: Date.now(), arg: typeof arg === 'symbol' ? '⊘ skip' : arg, status: q.status, isLoading: q.isLoading, isFetching: q.isFetching },
      ...historyRef.current,
    ].slice(0, 20)
    con.log(`[render #${renderRef.current}] arg=${typeof arg === 'symbol' ? 'skip' : arg} · status=${q.status} · isLoading=${q.isLoading} · isFetching=${q.isFetching} · data=${q.data?.name ?? 'undefined'}`)
  }, [q.status, q.isLoading, q.isFetching, q.data, arg])

  return (
    <div>
      <div className="btn-group" style={{ margin: '12px 0' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.85rem' }}>
          name:
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              padding: '6px 10px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              color: 'var(--text-bright)',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-mono)',
              fontSize: '.85rem',
              width: 140,
            }}
          />
        </label>
        <button className="btn btn--accent" onClick={() => setName('pikachu')}>pikachu</button>
        <button className="btn btn--accent" onClick={() => setName('charizard')}>charizard</button>
        <button className="btn btn--accent" onClick={() => setName('mewtwo')}>mewtwo</button>
        <button className="btn btn--danger" onClick={() => setName('missingno')}>missingno (404)</button>
        <button className="btn" onClick={() => q.refetch()} disabled={!active || q.isFetching}>▶ refetch()</button>
        <button className="btn" onClick={() => setActive((x) => !x)}>
          {active ? '◯ skip (stop hook)' : '▶ activate'}
        </button>
        <span className="render-count">renders: {renderRef.current}</span>
      </div>

      <div className="hook-grid">
        {/* Status flags */}
        <div className="return-panel">
          <h4>Status flags</h4>
          <div className="flag-row">
            <span className="flag-row__name">isUninitialized</span>
            <span className={`flag-row__val ${flag(q.isUninitialized)}`}>{String(q.isUninitialized)}</span>
            <span className="flag-row__hint">ещё не было initiate</span>
          </div>
          <div className="flag-row">
            <span className="flag-row__name">isLoading</span>
            <span className={`flag-row__val ${flag(q.isLoading)}`}>{String(q.isLoading)}</span>
            <span className="flag-row__hint">первая загрузка, data=undefined</span>
          </div>
          <div className="flag-row">
            <span className="flag-row__name">isFetching</span>
            <span className={`flag-row__val ${flag(q.isFetching)}`}>{String(q.isFetching)}</span>
            <span className="flag-row__hint">любая загрузка (refetch, arg change)</span>
          </div>
          <div className="flag-row">
            <span className="flag-row__name">isSuccess</span>
            <span className={`flag-row__val ${flag(q.isSuccess)}`}>{String(q.isSuccess)}</span>
            <span className="flag-row__hint">последний fulfilled</span>
          </div>
          <div className="flag-row">
            <span className="flag-row__name">isError</span>
            <span className={`flag-row__val ${flag(q.isError, true)}`}>{String(q.isError)}</span>
            <span className="flag-row__hint">последний rejected</span>
          </div>
          <div className="flag-row">
            <span className="flag-row__name">status</span>
            <span className="flag-row__val t" style={{ background: 'rgba(86,156,214,.2)', color: 'var(--accent)' }}>{q.status}</span>
            <span className="flag-row__hint">enum 4 значения</span>
          </div>
        </div>

        {/* Data */}
        <div className="return-panel">
          <h4>Data & meta</h4>
          <div className="status-grid">
            <div className="status-cell"><strong>requestId</strong><br />{q.requestId ?? '—'}</div>
            <div className="status-cell"><strong>endpoint</strong><br />{q.endpointName ?? '—'}</div>
            <div className="status-cell"><strong>arg</strong><br />{typeof arg === 'symbol' ? '⊘ skip' : arg}</div>
            <div className="status-cell"><strong>started</strong><br />{formatStamp(q.startedTimeStamp)}</div>
            <div className="status-cell"><strong>fulfilled</strong><br />{formatStamp(q.fulfilledTimeStamp)}</div>
            <div className="status-cell"><strong>originalArgs</strong><br />{q.originalArgs != null ? String(q.originalArgs) : '—'}</div>
          </div>

          <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 8, fontFamily: 'var(--font-mono)' }}>
            data = last fulfilled (сохраняется при смене arg)
          </div>
          <div className="data-preview">
            {q.data ? JSON.stringify(q.data, null, 2) : 'undefined'}
          </div>

          <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 8, fontFamily: 'var(--font-mono)' }}>
            currentData = data только для текущего arg (undefined при смене)
          </div>
          <div className="data-preview">
            {q.currentData ? JSON.stringify(q.currentData, null, 2) : 'undefined'}
          </div>

          {q.error ? (
            <>
              <div style={{ fontSize: '.72rem', color: 'var(--accent-red)', marginTop: 8, fontFamily: 'var(--font-mono)' }}>error</div>
              <div className="data-preview" style={{ color: 'var(--accent-red)' }}>
                {JSON.stringify(q.error, null, 2)}
              </div>
            </>
          ) : null}
        </div>
      </div>

      <h4 style={{ color: 'var(--text-bright)', fontSize: '.9rem', margin: '16px 0 6px' }}>История изменений hook (последние 20)</h4>
      <div className="history-log">
        {historyRef.current.length === 0 ? <div>—</div> : historyRef.current.map((h, i) => (
          <div key={`${h.t}-${i}`}>
            <span style={{ color: 'var(--text-muted)' }}>{formatStamp(h.t)}</span>
            {' · '}
            <span style={{ color: 'var(--accent-cyan)' }}>arg={h.arg}</span>
            {' · '}
            <span style={{ color: 'var(--accent)' }}>status={h.status}</span>
            {' · '}
            <span style={{ color: h.isLoading ? 'var(--success)' : 'var(--text-muted)' }}>isLoading={String(h.isLoading)}</span>
            {' · '}
            <span style={{ color: h.isFetching ? 'var(--success)' : 'var(--text-muted)' }}>isFetching={String(h.isFetching)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const rootEl = document.getElementById('react-root')!
createRoot(rootEl).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)

con.info('Ввод в input → arg меняется → isFetching=true, но isLoading остаётся false (это не первая загрузка).')
con.info('Клик refetch() → дополнительный запрос тем же cacheKey. isFetching=true, data сохраняется.')
con.info('«skip» — останавливает hook: isUninitialized=true, data=undefined. skipToken типобезопаснее опции {skip}.')
