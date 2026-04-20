import {
  configureStore,
  createAction,
  createReducer,
  nanoid,
  isAnyOf,
  isAllOf,
  isRejectedWithValue,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── Actions ──
const loggedIn = createAction<{ id: string }>('user/loggedIn')
const loggedOut = createAction('user/loggedOut')
const userUpdated = createAction<{ name: string }>('user/updated')
const otherAction = createAction('unrelated/action')

const userFetchRejected = createAction('user/fetch/rejected', (msg: string) => ({
  payload: msg,
  error: { message: msg, name: 'RejectedError' },
  meta: {
    arg: undefined,
    requestId: nanoid(),
    requestStatus: 'rejected' as const,
    aborted: false,
    condition: false,
    rejectedWithValue: true,
  },
}))
const otherRejected = createAction('posts/fetch/rejected', (msg: string) => ({
  payload: msg,
  error: { message: msg, name: 'RejectedError' },
  meta: {
    arg: undefined,
    requestId: nanoid(),
    requestStatus: 'rejected' as const,
    aborted: false,
    condition: false,
    rejectedWithValue: true,
  },
}))
const userFetchFulfilled = createAction('user/fetch/fulfilled', (data: { ok: true }) => ({
  payload: data,
  meta: {
    arg: undefined,
    requestId: nanoid(),
    requestStatus: 'fulfilled' as const,
  },
}))

// ── Matchers ──
const isUserAction = isAnyOf(loggedIn, loggedOut, userUpdated, userFetchRejected, userFetchFulfilled)
const isUserError = isAllOf(isRejectedWithValue, (a: unknown) =>
  typeof (a as { type?: unknown })?.type === 'string' && (a as { type: string }).type.startsWith('user/')
)

// ── State ──
const reducer = createReducer({ events: [] as string[] }, (b) => {
  b.addCase(loggedIn, (s) => { s.events.push('loggedIn') })
   .addCase(loggedOut, (s) => { s.events.push('loggedOut') })
   .addCase(userUpdated, (s) => { s.events.push('userUpdated') })
   .addCase(otherAction, (s) => { s.events.push('other') })
   .addMatcher(isRejectedWithValue, (s) => { s.events.push('any rejected') })
})

const store = configureStore({ reducer: { log: reducer } })

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог matchers')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const idsOut = document.getElementById('ids-out')!
const anyOut = document.getElementById('any-out')!
const allOut = document.getElementById('all-out')!

function addId(id: string): void {
  const el = document.createElement('div')
  el.textContent = id
  idsOut.appendChild(el)
  idsOut.scrollTop = idsOut.scrollHeight
}

function showAny(action: unknown): void {
  const anyResult = isUserAction(action)
  anyOut.innerHTML = `isAnyOf(loggedIn, loggedOut, userUpdated)(action) = <strong style="color: ${anyResult ? 'var(--success)' : 'var(--accent-red)'};">${anyResult}</strong>\naction.type = "${(action as { type: string }).type}"`
}

function showAll(action: unknown): void {
  const rejected = isRejectedWithValue(action)
  const startsUser = String((action as { type: string }).type).startsWith('user/')
  const userMatch = isUserError(action)
  const colorR = rejected ? 'var(--success)' : 'var(--accent-red)'
  const colorS = startsUser ? 'var(--success)' : 'var(--accent-red)'
  const colorM = userMatch ? 'var(--success)' : 'var(--accent-red)'
  allOut.innerHTML = `isRejectedWithValue(action) = <strong style="color:${colorR}">${rejected}</strong>
action.type starts with 'user/' = <strong style="color:${colorS}">${startsUser}</strong>
isAllOf(...) = <strong style="color:${colorM}">${userMatch}</strong>`
}

const OPS: Record<string, () => void> = {
  'id-default': () => { const id = nanoid(); addId(`nanoid()    = "${id}"  (${id.length} chars)`); con.info(`nanoid() = ${id}`) },
  'id-10':      () => { const id = nanoid(10); addId(`nanoid(10)  = "${id}"`); con.info(`nanoid(10) = ${id}`) },
  'id-5':       () => { const id = nanoid(5); addId(`nanoid(5)   = "${id}"`); con.info(`nanoid(5) = ${id}`) },
  'id-100': () => {
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) ids.add(nanoid())
    addId(`100 штук сгенерировано, уникальных: ${ids.size} (ожидаем 100)`)
    con.success(`Коллизий нет: ${ids.size}/100`)
  },
  'id-clear': () => { idsOut.textContent = '— очищено —' },

  'any-login':  () => { const a = loggedIn({ id: nanoid(6) }); store.dispatch(a); con.action(a); showAny(a) },
  'any-update': () => { const a = userUpdated({ name: 'Bob' }); store.dispatch(a); con.action(a); showAny(a) },
  'any-other':  () => { const a = otherAction(); store.dispatch(a); con.action(a); showAny(a) },

  'all-userfail':   () => { const a = userFetchRejected('404'); store.dispatch(a); con.action(a); showAll(a) },
  'all-otherfail':  () => { const a = otherRejected('500'); store.dispatch(a); con.action(a); showAll(a) },
  'all-userok':     () => { const a = userFetchFulfilled({ ok: true }); store.dispatch(a); con.action(a); showAll(a) },
}

document.querySelectorAll<HTMLButtonElement>('[data-op]').forEach((btn) => {
  btn.addEventListener('click', () => OPS[btn.dataset.op!]())
})

con.log('isAnyOf / isAllOf — комбинируйте matcher'+'ы для addMatcher и listenerMiddleware.')
con.info('nanoid() использует crypto.getRandomValues — криптографически random (но не secure-grade).')
