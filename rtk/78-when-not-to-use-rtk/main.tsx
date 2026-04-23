import { ConsolePanel } from '../shared/console-panel'

const con = new ConsolePanel(document.getElementById('console-container')!, 'Decision tree log')

// ────────────────────────────────────────────────────────────────
// Decision tree — state machine на plain TypeScript
// ────────────────────────────────────────────────────────────────
type NodeId =
  | 'q_shared'
  | 'q_server_or_client'
  | 'q_devtools'
  | 'q_cross_cutting'
  | 'q_redux_already'
  | 'q_large_team'
  | 'q_atomic'
  | 'r_useState'
  | 'r_zustand'
  | 'r_jotai'
  | 'r_rtk'
  | 'r_rtkQuery'
  | 'r_reactQuery'

interface Question {
  kind: 'q'
  text: string
  hint?: string
  yes: NodeId
  no: NodeId
}

interface Result {
  kind: 'r'
  tool: string
  reason: string
  pros: string[]
  cons: string[]
  link: { href: string; text: string }
}

type Node = Question | Result

const TREE: Record<NodeId, Node> = {
  q_shared: {
    kind: 'q',
    text: 'Нужно ли делить state между многими компонентами, разбросанными по дереву?',
    hint: 'Если state сидит в одном компоненте или паре соседей — global store не нужен, хватит useState / useReducer + props.',
    yes: 'q_server_or_client',
    no: 'r_useState',
  },
  q_server_or_client: {
    kind: 'q',
    text: 'Это в основном Server state (данные с бэкенда через GET/POST) или Client state (UI, настройки, selection)?',
    hint: 'Server state — это «чужие данные, которые нужно загружать, кэшировать, инвалидировать». Client state — «наши данные, живущие только в браузере».',
    yes: 'q_redux_already',     // Yes = server state
    no: 'q_devtools',            // No  = client state
  },
  q_redux_already: {
    kind: 'q',
    text: 'В проекте уже используется Redux / RTK?',
    hint: 'Если да — RTK Query встроится в существующий store. Если нет — React Query избавит от тащить целиком Redux ради одного fetch.',
    yes: 'r_rtkQuery',
    no: 'r_reactQuery',
  },
  q_devtools: {
    kind: 'q',
    text: 'Важны ли Redux DevTools / time-travel debugging / replay actions?',
    hint: 'DevTools полезны, когда нужно воспроизводить сложные баги и откатывать state. Для простых UI-стейтов обычно избыточно.',
    yes: 'q_cross_cutting',
    no: 'q_atomic',
  },
  q_cross_cutting: {
    kind: 'q',
    text: 'Есть cross-cutting побочки: analytics on actions, notifications, WebSocket subscriptions, undo/redo?',
    hint: 'Такое удобно решать через middleware (listenerMiddleware, saga). Zustand не даёт столько экосистемы.',
    yes: 'r_rtk',
    no: 'q_large_team',
  },
  q_large_team: {
    kind: 'q',
    text: 'Команда ≥ 3 человек и/или проект рассчитан на 2+ года?',
    hint: 'Redux/RTK дают единый convention и предсказуемую архитектуру. Для мелких SPA и прототипов это overkill.',
    yes: 'r_rtk',
    no: 'r_zustand',
  },
  q_atomic: {
    kind: 'q',
    text: 'Хотите fine-grained reactivity — переобновление на уровне отдельных "атомов"?',
    hint: 'Jotai строит state из атомов, каждый подписчик зависит ровно от того, что читает. Подойдёт для тяжёлого UI (графики, большие формы).',
    yes: 'r_jotai',
    no: 'r_zustand',
  },

  // ── Results ──────────────────────────────────────────────────
  r_useState: {
    kind: 'r',
    tool: 'React useState / useReducer',
    reason: 'Если state принадлежит одному-двум компонентам — не нужен global store. Пропсы и lift-up решают задачу. 0 KB дополнительного bundle.',
    pros: ['Нулевой bundle', 'Нет конфигурации', 'Нативная модель React', 'Отлично типизируется'],
    cons: ['Prop drilling на 3+ уровнях', 'Нет DevTools', 'Нет общего middleware'],
    link: { href: 'https://react.dev/reference/react/useState', text: 'react.dev — useState' },
  },
  r_zustand: {
    kind: 'r',
    tool: 'Zustand',
    reason: 'Global store без ceremony: 4 строки create(...). Для small/medium SPA без cross-cutting побочек — идеальный trade-off.',
    pros: ['~1 KB bundle', 'Нет Provider', 'Простой API', 'Selector из коробки'],
    cons: ['Слабая экосистема middleware', 'DevTools только через плагин', 'Нет формальной структуры — может размазаться'],
    link: { href: 'https://zustand-demo.pmnd.rs/', text: 'Zustand docs' },
  },
  r_jotai: {
    kind: 'r',
    tool: 'Jotai',
    reason: 'Атомарный state — каждый атом как useState, но глобальный. Fine-grained обновления, никаких ререндеров без нужды.',
    pros: ['Fine-grained reactivity', 'Композиция атомов', 'Отлично для complex UIs'],
    cons: ['Большая кривая мышления', 'Нет «одного store для просмотра»', 'DevTools ограниченные'],
    link: { href: 'https://jotai.org/', text: 'Jotai docs' },
  },
  r_rtk: {
    kind: 'r',
    tool: 'Redux + Redux Toolkit',
    reason: 'Большие приложения, cross-cutting concerns, time-travel, 3+ разработчиков, долгий горизонт. RTK убирает boilerplate классики.',
    pros: ['Лучшие DevTools', 'Мощные middleware (listener, saga)', 'Единый стандарт', 'Immer + TypeScript'],
    cons: ['~14 KB bundle', 'Кривая обучения', 'Boilerplate выше, чем у Zustand', 'Для мелких проектов избыточен'],
    link: { href: 'https://redux-toolkit.js.org/', text: 'redux-toolkit.js.org' },
  },
  r_rtkQuery: {
    kind: 'r',
    tool: 'RTK Query (внутри вашего Redux store)',
    reason: 'Server state + уже есть Redux — используйте встроенный RTKQ. Cache, dedup, invalidation, polling — из коробки, интеграция с DevTools.',
    pros: ['Уже внутри RTK — 0 доп. зависимостей', 'Один DevTools', 'Type-safe endpoints', 'Tags для invalidation'],
    cons: ['Не заменяет slice для client state', 'API строже, чем у React Query'],
    link: { href: 'https://redux-toolkit.js.org/rtk-query/overview', text: 'RTK Query overview' },
  },
  r_reactQuery: {
    kind: 'r',
    tool: 'TanStack Query (React Query)',
    reason: 'Server state без Redux — React Query решает всё: cache, dedup, invalidation, background refetch, optimistic updates. Не тащит global store.',
    pros: ['Мощнейший API для server state', 'Отдельный Devtools', 'Огромная экосистема'],
    cons: ['+13 KB bundle', 'Не решает client state', 'Легко дублировать с Redux, если добавите потом'],
    link: { href: 'https://tanstack.com/query/latest', text: 'tanstack.com/query' },
  },
}

// ────────────────────────────────────────────────────────────────
// Render
// ────────────────────────────────────────────────────────────────
const root = document.getElementById('tree-root')!
interface PathEntry { question: string; answer: 'Yes' | 'No' }
let path: PathEntry[] = []
let current: NodeId = 'q_shared'

function render(): void {
  const node = TREE[current]
  if (node.kind === 'q') renderQuestion(node)
  else renderResult(node)
}

function renderQuestion(q: Question): void {
  root.innerHTML = `
    <div class="tree-breadcrumbs">
      ${path.length === 0 ? '<span>Start</span>' : path.map((p) =>
        `<span class="${p.answer === 'Yes' ? 'yes' : 'no'}">${escapeHtml(p.question)} · ${p.answer}</span>`
      ).join('')}
    </div>
    <div class="tree-question">${escapeHtml(q.text)}</div>
    ${q.hint ? `<div class="tree-hint">${q.hint}</div>` : ''}
    <div class="tree-buttons">
      <button class="btn btn--yes" id="ans-yes">Yes</button>
      <button class="btn btn--no" id="ans-no">No</button>
      ${path.length > 0 ? '<button class="btn btn--secondary" id="ans-back">← Back</button>' : ''}
    </div>
  `
  document.getElementById('ans-yes')!.addEventListener('click', () => answer('Yes', q.yes, q.text))
  document.getElementById('ans-no')!.addEventListener('click', () => answer('No', q.no, q.text))
  const back = document.getElementById('ans-back')
  if (back) back.addEventListener('click', stepBack)
}

function renderResult(r: Result): void {
  root.innerHTML = `
    <div class="tree-breadcrumbs">
      ${path.map((p) =>
        `<span class="${p.answer === 'Yes' ? 'yes' : 'no'}">${escapeHtml(p.question)} · ${p.answer}</span>`
      ).join('')}
    </div>
    <div class="tree-result">
      <div class="tree-result__tool">→ ${escapeHtml(r.tool)}</div>
      <div class="tree-result__reason">${escapeHtml(r.reason)}</div>
      <div class="tree-result__pros-cons">
        <div class="tree-result__box pros">
          <h4>Плюсы</h4>
          <ul>${r.pros.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
        </div>
        <div class="tree-result__box cons">
          <h4>Минусы</h4>
          <ul>${r.cons.map((c) => `<li>${escapeHtml(c)}</li>`).join('')}</ul>
        </div>
      </div>
      <a class="tree-result__link" href="${r.link.href}" target="_blank">${escapeHtml(r.link.text)} →</a>
      <button class="btn tree-result__restart" id="restart">↻ Начать заново</button>
    </div>
  `
  document.getElementById('restart')!.addEventListener('click', restart)
  con.success(`Итог: ${r.tool}`)
}

function answer(a: 'Yes' | 'No', next: NodeId, qText: string): void {
  path.push({ question: qText, answer: a })
  current = next
  con.info(`[${a}] → ${next}`)
  render()
}

function stepBack(): void {
  if (path.length === 0) return
  path.pop()
  // reconstruct — идём заново и останавливаемся на текущей длине path
  let n: NodeId = 'q_shared'
  for (const p of path) {
    const node: Node = TREE[n]
    if (node.kind !== 'q') break
    n = p.answer === 'Yes' ? node.yes : node.no
  }
  current = n
  render()
}

function restart(): void {
  path = []
  current = 'q_shared'
  con.log('Дерево сброшено.')
  render()
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

render()
con.log('Отвечайте Yes / No — дерево приведёт к рекомендации.')
con.info('Каждый ответ логируется здесь; Back возвращает на шаг назад.')
