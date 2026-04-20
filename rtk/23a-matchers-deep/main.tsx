import {
  configureStore,
  createAction,
  createReducer,
  nanoid,
  isAnyOf,
  isAllOf,
  type PayloadAction,
  type Action,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ─────────────────────────────────────────────────────────────────────────────
// Реальный сценарий: приложение хочет
//   (1) показывать toast-уведомления для разных action'ов
//   (2) трекать analytics-события для всего, что в namespace 'analytics/'
//   (3) обновлять lastActivity timestamp на любой пользовательский action из 'user/'
//
// ВМЕСТО того чтобы в каждом slice'е дублировать notify/track/touch —
// мы пишем 3 matcher'а и используем их в addMatcher(). Один источник правды.
// ─────────────────────────────────────────────────────────────────────────────

// === 1. ACTION CREATORS ====================================================
// (для краткости — без отдельных slice'ов; реальный код был бы в slice.ts)

interface NotifyMeta {
  notify: { kind: 'success' | 'error' | 'info'; message: string }
}

const userLoggedIn = createAction('user/loggedIn', (name: string) => ({
  payload: { name },
  meta: { notify: { kind: 'success', message: `Привет, ${name}!` } } as NotifyMeta,
}))

const userLoggedOut = createAction('user/loggedOut', () => ({
  payload: undefined,
  meta: { notify: { kind: 'info', message: 'Вы вышли' } } as NotifyMeta,
}))

const fileSaved = createAction('files/saved', (name: string) => ({
  payload: { name },
  meta: { notify: { kind: 'success', message: `Файл "${name}" сохранён` } } as NotifyMeta,
}))

const fileDeleteFailed = createAction('files/deleteFailed', (name: string) => ({
  payload: { name },
  error: true,
  meta: { notify: { kind: 'error', message: `Не удалось удалить "${name}"` } } as NotifyMeta,
}))

const analyticsClicked = createAction('analytics/clicked', (id: string) => ({
  payload: { buttonId: id },
}))

const analyticsViewed = createAction('analytics/viewed', (page: string) => ({
  payload: { page },
}))

const silentTick = createAction<number>('clock/tick')

// === 2. MATCHERS (главное!) ================================================

// (a) Базовый: matcher — это просто функция (action) => boolean.
//     В TS лучше делать type-predicate `action is X` для type narrowing внутри handler.
type NotifyAction = Action & { meta: NotifyMeta }

const isNotifyAction = (action: unknown): action is NotifyAction => {
  if (!action || typeof action !== 'object') return false
  const a = action as { meta?: { notify?: unknown } }
  return (
    !!a.meta &&
    typeof a.meta.notify === 'object' &&
    a.meta.notify !== null &&
    'kind' in a.meta.notify &&
    'message' in a.meta.notify
  )
}

// (b) Matcher по namespace action.type
const isAnalyticsAction = (action: unknown): action is Action => {
  return (
    !!action &&
    typeof (action as Action).type === 'string' &&
    (action as Action).type.startsWith('analytics/')
  )
}

// (c) Matcher по namespace 'user/'
const isUserNamespace = (action: unknown): action is Action => {
  return (
    !!action &&
    typeof (action as Action).type === 'string' &&
    (action as Action).type.startsWith('user/')
  )
}

// (d) Композиция matcher'ов через isAnyOf — то же, что (a) но через actionCreator'ы.
//     Минус: нужно перечислять все вручную (легко забыть новый action).
const isAnyNotifyExplicit = isAnyOf(userLoggedIn, userLoggedOut, fileSaved, fileDeleteFailed)

// (e) isAllOf — комбинируем несколько условий.
//     Пример: «user-action, у которого ЕСТЬ notify».
const isUserNotify = isAllOf(isUserNamespace, isNotifyAction)

// === 3. STATE + REDUCER ====================================================

interface Notification { id: string; kind: 'success' | 'error' | 'info'; message: string }
interface AnalyticsEvent { id: string; type: string; data: unknown; at: number }

interface State {
  notifications: Notification[]
  analytics: AnalyticsEvent[]
  lastUserActivity: number | null
  userNotifyCount: number   // сработал isAllOf(isUserNamespace, isNotifyAction)
  totalDispatched: number
}

const initial: State = {
  notifications: [],
  analytics: [],
  lastUserActivity: null,
  userNotifyCount: 0,
  totalDispatched: 0,
}

const reducer = createReducer<State>(initial, (b) => {
  b
    // addCase нужен только для actions, у которых СВОЯ логика state-обновления
    // (например, очистка нотификаций по клику). Для остальной "сквозной"
    // логики используем matchers ниже — один обработчик на N action'ов.
    .addCase('notifications/dismiss', (s, a: PayloadAction<string>) => {
      s.notifications = s.notifications.filter((n) => n.id !== a.payload)
    })
    .addCase('notifications/clear', (s) => {
      s.notifications = []
    })

    // (1) Любой action с meta.notify → push в notifications.
    //     Внутри handler TypeScript ЗНАЕТ про action.meta.notify благодаря type-predicate.
    .addMatcher(isNotifyAction, (s, action) => {
      s.notifications.push({
        id: nanoid(6),
        kind: action.meta.notify.kind,
        message: action.meta.notify.message,
      })
    })

    // (2) Любой action из 'analytics/' → лог в analytics array.
    .addMatcher(isAnalyticsAction, (s, action) => {
      s.analytics.push({
        id: nanoid(6),
        type: action.type,
        data: (action as { payload?: unknown }).payload,
        at: Date.now(),
      })
    })

    // (3) Любой action из 'user/' → обновить lastActivity timestamp.
    .addMatcher(isUserNamespace, (s) => {
      s.lastUserActivity = Date.now()
    })

    // (4) ВНИМАНИЕ: matcher'ы выполняются ВСЕ подряд, кто совпал.
    //     userLoggedIn попадает И под (1) isNotifyAction, И под (3) isUserNamespace,
    //     И под (4) isAllOf(isUserNamespace, isNotifyAction). Все три отработают.
    .addMatcher(isUserNotify, (s) => {
      s.userNotifyCount++
    })

    // (5) Сквозной счётчик ВСЕХ dispatched (кроме служебных redux init).
    .addMatcher(
      (action: unknown): action is Action =>
        !!action &&
        typeof (action as Action).type === 'string' &&
        !(action as Action).type.startsWith('@@'),
      (s) => { s.totalDispatched++ }
    )
})

// === 4. STORE + UI =========================================================

const store = configureStore({ reducer: { app: reducer } })
type AppState = ReturnType<typeof store.getState>

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог matcher-демо')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const toastsEl = document.getElementById('toasts')!
const analyticsEl = document.getElementById('analytics-log')!
const statsEl = document.getElementById('stats')!

function render(): void {
  const s: AppState['app'] = store.getState().app

  // Toasts
  if (s.notifications.length === 0) {
    toastsEl.innerHTML = '<div class="empty">— нет уведомлений —</div>'
  } else {
    toastsEl.innerHTML = s.notifications
      .map((n) => `
        <div class="toast toast--${n.kind}">
          <span class="toast__kind">${n.kind}</span>
          <span class="toast__msg">${n.message}</span>
          <button class="toast__close" data-dismiss="${n.id}">×</button>
        </div>
      `).join('')
    toastsEl.querySelectorAll<HTMLButtonElement>('[data-dismiss]').forEach((btn) => {
      btn.addEventListener('click', () => {
        store.dispatch({ type: 'notifications/dismiss', payload: btn.dataset.dismiss })
      })
    })
  }

  // Analytics
  if (s.analytics.length === 0) {
    analyticsEl.innerHTML = '<div class="empty">— нет событий —</div>'
  } else {
    analyticsEl.innerHTML = s.analytics
      .slice(-8)
      .map((e) => `
        <div class="ev">
          <span class="ev__type">${e.type}</span>
          <span class="ev__data">${JSON.stringify(e.data)}</span>
        </div>
      `).join('')
  }

  // Stats
  statsEl.innerHTML = `
    <div class="stat"><span>Всего dispatched</span><strong>${s.totalDispatched}</strong></div>
    <div class="stat"><span>Notifications живых</span><strong>${s.notifications.length}</strong></div>
    <div class="stat"><span>Analytics events</span><strong>${s.analytics.length}</strong></div>
    <div class="stat"><span>userNotifyCount (isAllOf)</span><strong>${s.userNotifyCount}</strong></div>
    <div class="stat"><span>Last user activity</span><strong>${s.lastUserActivity ? new Date(s.lastUserActivity).toLocaleTimeString() : '—'}</strong></div>
  `
}
store.subscribe(render)

// === 5. КНОПКИ-ACTIONS =====================================================

const ACTIONS: Record<string, () => Action> = {
  'user-login':    () => userLoggedIn('Алиса'),
  'user-logout':   () => userLoggedOut(),
  'file-save':     () => fileSaved(`doc-${Math.floor(Math.random() * 100)}.md`),
  'file-fail':     () => fileDeleteFailed('important.txt'),
  'an-click':      () => analyticsClicked(`btn-${nanoid(4)}`),
  'an-view':       () => analyticsViewed('/dashboard'),
  'silent-tick':   () => silentTick(Date.now()),
  'clear-toasts':  () => ({ type: 'notifications/clear' }),
}

document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const a = ACTIONS[btn.dataset.action!]()
    store.dispatch(a)
    con.action(a)

    // Параллельно покажем какие matcher'ы СОВПАЛИ для этого action
    showMatcherFlow(a)
  })
})

// === 6. ВИЗУАЛИЗАЦИЯ: какой matcher сработал ==============================

function showMatcherFlow(action: Action): void {
  const flow = document.getElementById('matcher-flow')!
  const checks = [
    { name: 'isNotifyAction(a)',                    pass: isNotifyAction(action) },
    { name: "isAnalyticsAction(a) — type startsWith 'analytics/'", pass: isAnalyticsAction(action) },
    { name: "isUserNamespace(a) — type startsWith 'user/'",        pass: isUserNamespace(action) },
    { name: 'isAnyNotifyExplicit(a) — isAnyOf(...4 actions)',      pass: isAnyNotifyExplicit(action) },
    { name: 'isUserNotify(a) — isAllOf(isUserNamespace, isNotifyAction)', pass: isUserNotify(action) },
    { name: 'userLoggedIn.match(a) — встроенный matcher actionCreator', pass: userLoggedIn.match(action) },
  ]
  flow.innerHTML = `
    <div class="flow__title">action <code>${action.type}</code> — какие matcher'ы сработали:</div>
    ${checks.map((c) => `
      <div class="flow__row ${c.pass ? 'pass' : 'fail'}">
        <span class="flow__mark">${c.pass ? '✓' : '✗'}</span>
        <span class="flow__name">${c.name}</span>
        <span class="flow__val">${c.pass}</span>
      </div>
    `).join('')}
  `
}

render()
con.log('Каждый клик dispatch\'ит action. Смотрите, КАКИЕ matcher\'ы для него сработали.')
con.info('userLoggedIn попадает под 4 matcher\'а сразу — все 4 handler\'а в reducer\'е выполнятся за один dispatch.')
