import { ConsolePanel } from '../shared/console-panel'

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог симулятора импортов'
)

const out = document.getElementById('sim-output')!

interface Sim {
  ok: boolean
  importLine: string
  result: string
  hint: string
}

const SCENARIOS: Record<string, Sim> = {
  'ok-core': {
    ok: true,
    importLine: `import { configureStore, createSlice } from '@reduxjs/toolkit'`,
    result: `// ✓ OK\nconst store = configureStore({ reducer: {} })\n// store.dispatch, store.getState доступны`,
    hint: 'Базовый импорт. Подходит для любого проекта без RTK Query.',
  },
  'ok-query': {
    ok: true,
    importLine: `import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query'`,
    result: `// ✓ OK (но без хуков!)\nconst api = createApi({\n  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),\n  endpoints: (build) => ({\n    getPosts: build.query<Post[], void>({ query: () => 'posts' }),\n  }),\n})\n// доступно: api.reducer, api.middleware, api.endpoints.getPosts.initiate(...)\n// НЕ доступно: api.useGetPostsQuery (для этого нужен /query/react)`,
    hint: 'Подходит для не-React проектов или если хуки не нужны.',
  },
  'ok-query-react': {
    ok: true,
    importLine: `import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'`,
    result: `// ✓ OK + хуки\nconst api = createApi({ ... })\nexport const { useGetPostsQuery } = api\n// React-компонент:\nfunction Posts() {\n  const { data, isLoading } = useGetPostsQuery()\n  ...\n}`,
    hint: 'Самый частый импорт для React-приложений с RTK Query.',
  },
  'bad-hooks': {
    ok: false,
    importLine: `import { createApi } from '@reduxjs/toolkit/query'`,
    result: `// ✗ ERROR в runtime\nconst api = createApi({\n  endpoints: (build) => ({\n    getPosts: build.query({ query: () => 'posts' }),\n  }),\n})\nconst { useGetPostsQuery } = api\n// → Property 'useGetPostsQuery' does not exist on type 'Api<...>'\n//   Хуки генерируются ТОЛЬКО при импорте из /query/react`,
    hint: 'Решение: import из @reduxjs/toolkit/query/react.',
  },
  'bad-store-react': {
    ok: false,
    importLine: `import { configureStore } from '@reduxjs/toolkit/query/react'`,
    result: `// ⚠ ERROR — configureStore не экспортируется из /query/react\n// → Module '"@reduxjs/toolkit/query/react"' has no exported member 'configureStore'\n//   /query/react содержит только createApi/fetchBaseQuery/setupListeners/retry/ApiProvider`,
    hint: 'configureStore всегда импортируется из @reduxjs/toolkit (core).',
  },
}

function render(sim: Sim): void {
  const cls = sim.ok ? 'ok-mark' : 'err-mark'
  const icon = sim.ok ? '✓' : '✗'
  out.innerHTML = `
    <div class="repl-block">
      <div class="repl-block__head">// импорт</div>
      <div class="repl-block__body">${escape(sim.importLine)}</div>
    </div>
    <div class="repl-block">
      <div class="repl-block__head"><span class="${cls}">${icon}</span> результат</div>
      <div class="repl-block__body">${escape(sim.result)}</div>
    </div>
    <div style="font-size: .82rem; color: var(--text-secondary); padding: 4px 8px;">💡 ${sim.hint}</div>
  `
}

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

document.querySelectorAll<HTMLButtonElement>('[data-sim]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.sim!
    const sim = SCENARIOS[key]
    render(sim)
    if (sim.ok) {
      con.success(`✓ ${key}: импорт корректный`)
    } else {
      con.error(`✗ ${key}: ошибка — ${sim.hint}`)
    }
  })
})

con.log('Кликайте кнопки чтобы увидеть результат каждого импорта.')
con.info('Главное правило: хуки use*Query/use*Mutation генерируются ТОЛЬКО при createApi из /query/react.')
