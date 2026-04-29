import { StrictMode, useState, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { ConsolePanel } from '../shared/console-panel'

interface Row { feature: string; rtkq: string; rq: string; swr: string; notes?: string }

const DATA: Row[] = [
  { feature: 'Integration с Redux',       rtkq: '✅ native',        rq: 'нет',           swr: 'нет' },
  { feature: 'Bundle size (mini)',        rtkq: '~17kb*',           rq: '~14kb',         swr: '~4kb' },
  { feature: 'Auto-generated hooks',      rtkq: '✅',               rq: '❌ (ручные)',    swr: '❌ (ручные)' },
  { feature: 'Query + Mutation в одном',  rtkq: '✅',               rq: '✅',            swr: 'только GET' },
  { feature: 'Tag-based invalidation',    rtkq: '✅ built-in',      rq: 'queryKey match', swr: 'manual' },
  { feature: 'Optimistic updates',        rtkq: '✅',               rq: '✅',            swr: '✅' },
  { feature: 'Streaming (WS/SSE)',         rtkq: '✅ onCacheEntryAdded', rq: 'external', swr: 'external' },
  { feature: 'Infinite queries',          rtkq: '✅',               rq: '✅',            swr: 'useSWRInfinite' },
  { feature: 'Prefetch',                  rtkq: '✅ usePrefetch',   rq: 'prefetchQuery', swr: 'preload' },
  { feature: 'Code splitting endpoints',  rtkq: '✅ injectEndpoints', rq: 'manual',      swr: 'manual' },
  { feature: 'SSR',                       rtkq: '✅',               rq: '✅',            swr: '✅' },
  { feature: 'DevTools (time-travel)',    rtkq: '✅ Redux DT',      rq: 'RQ DevTools',   swr: 'нет' },
  { feature: 'Normalized cache',          rtkq: '✅ entityAdapter', rq: 'manual',        swr: '❌' },
  { feature: 'Polling',                   rtkq: '✅',               rq: '✅',            swr: 'refreshInterval' },
  { feature: 'refetchOnFocus/Reconnect',  rtkq: '✅ opt-in',        rq: '✅ default',    swr: '✅ default' },
  { feature: 'TypeScript',                rtkq: '✅ best-in-class', rq: '✅',            swr: '✅' },
  { feature: 'Transport-agnostic',        rtkq: '✅ custom baseQ',  rq: '✅ queryFn',    swr: '✅ fetcher' },
  { feature: 'Middleware ecosystem',      rtkq: '✅ Redux',         rq: '❌',            swr: '❌' },
]

const con = new ConsolePanel(document.getElementById('console-container')!,
  'Сравнение трёх data-fetching библиотек')

function isYes(s: string): boolean { return s.startsWith('✅') }
function isNo(s: string): boolean { return s.startsWith('❌') || s === 'нет' }

function Demo(): ReactElement {
  const [filter, setFilter] = useState('')
  const filtered = DATA.filter(r => r.feature.toLowerCase().includes(filter.toLowerCase()))

  return (
    <div>
      <input
        type="text"
        placeholder="фильтр фич…"
        value={filter}
        onChange={e => setFilter(e.target.value)}
        style={{ padding: '6px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-bright)', borderRadius: 3, fontFamily: 'var(--font-mono)', fontSize: '.82rem', width: 280, marginBottom: 10 }}
      />
      <table className="compare-table">
        <thead>
          <tr>
            <th>Feature</th>
            <th>RTK Query</th>
            <th>React Query</th>
            <th>SWR</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r, i) => (
            <tr key={i}>
              <td className="feature">{r.feature}</td>
              <td className={isYes(r.rtkq) ? 'yes' : isNo(r.rtkq) ? 'no' : 'partial'}>{r.rtkq}</td>
              <td className={isYes(r.rq)   ? 'yes' : isNo(r.rq)   ? 'no' : 'partial'}>{r.rq}</td>
              <td className={isYes(r.swr)  ? 'yes' : isNo(r.swr)  ? 'no' : 'partial'}>{r.swr}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="verdict-card">
        <h5>Мой выбор</h5>
        <div style={{ fontSize: '.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--accent-cyan)' }}>RTK Query</strong> — если уже есть Redux,
          либо сложная client-state логика (listenerMiddleware, undo/redo, time-travel дебаг).
          <br/><br/>
          <strong style={{ color: 'var(--accent-cyan)' }}>React Query</strong> — если нет Redux и не планируется;
          нужен стандарт индустрии и лучшая экосистема плагинов.
          <br/><br/>
          <strong style={{ color: 'var(--accent-cyan)' }}>SWR</strong> — если Next.js/Vercel; проект простой
          с GET-heavy UI; важен размер бандла.
        </div>
      </div>
    </div>
  )
}

const host = document.getElementById('react-root')!
createRoot(host).render(
  <StrictMode>
    <Demo />
  </StrictMode>,
)

con.info('Пройдись по таблице — отметь то, что критично твоему проекту.')
con.info('Три общих принципа: нормализация (только RTKQ встроенно), invalidation (RTKQ теги — семантичнее), экосистема (у React Query сильная).')
