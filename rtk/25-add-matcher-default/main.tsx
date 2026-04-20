import { configureStore, createAction, createReducer, isAnyOf } from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

const userLoggedIn = createAction<{ id: number }>('user/loggedIn')
const userLoggedOut = createAction('user/loggedOut')

const userFetchRejected = createAction('user/fetch', (msg: string) => ({
  payload: msg,
  error: true,
  meta: { requestStatus: 'rejected' },
}))
const otherRejected = createAction('posts/fetch', (msg: string) => ({
  payload: msg,
  error: true,
  meta: { requestStatus: 'rejected' },
}))
const randomAction = createAction<string>('random/thing')

const isUserAction = isAnyOf(userLoggedIn, userLoggedOut, userFetchRejected)
const isRejected = (action: { type?: string; error?: unknown }): boolean =>
  action.error === true || String(action.type ?? '').endsWith('/rejected')

interface State { events: string[] }

function mark(step: number, matched: boolean): void {
  const el = document.getElementById(`step-${step}`)!
  el.classList.remove('matched', 'skipped')
  const status = el.querySelector('.flow-step__status')!
  status.classList.remove('wait', 'match', 'skip')
  if (matched) {
    el.classList.add('matched')
    status.classList.add('match')
    status.textContent = '✓ matched'
  } else {
    el.classList.add('skipped')
    status.classList.add('skip')
    status.textContent = 'skipped'
  }
}

function resetMarks(): void {
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById(`step-${i}`)!
    el.classList.remove('matched', 'skipped')
    const status = el.querySelector('.flow-step__status')!
    status.classList.remove('wait', 'match', 'skip')
    status.classList.add('wait')
    status.textContent = 'wait'
  }
}

const reducer = createReducer<State>({ events: [] }, (builder) => {
  builder
    .addCase(userLoggedIn, (s) => { s.events.push('#1 addCase(userLoggedIn)'); mark(1, true) })
    .addCase(userLoggedOut, (s) => { s.events.push('#2 addCase(userLoggedOut)'); mark(2, true) })
    .addMatcher(isUserAction, (s) => { s.events.push('#3 addMatcher(isUserAction)'); mark(3, true) })
    .addMatcher(isRejected, (s) => { s.events.push('#4 addMatcher(isRejected)'); mark(4, true) })
    .addDefaultCase((s, a) => { s.events.push(`#5 defaultCase для "${a.type}"`); mark(5, true) })
})

const store = configureStore({ reducer: { main: reducer } })

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог builder flow')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const currEl = document.getElementById('curr-action')!
const logEl = document.getElementById('ev-log')!

function render(): void {
  const events = store.getState().main.events
  if (events.length === 0) {
    logEl.innerHTML = '— пусто —'
    return
  }
  logEl.innerHTML = events.map(e => `<div class="ev-log__item">${e}</div>`).join('')
  logEl.scrollTop = logEl.scrollHeight
}
store.subscribe(render)

function checkSteps(action: { type: string; error?: unknown }): void {
  resetMarks()
  mark(1, userLoggedIn.match(action))
  mark(2, userLoggedOut.match(action))
  mark(3, isUserAction(action))
  mark(4, isRejected(action))

  const anyMatched =
    userLoggedIn.match(action) ||
    userLoggedOut.match(action) ||
    isUserAction(action) ||
    isRejected(action)
  mark(5, !anyMatched)
}

const DISPATCHES: Record<string, () => { type: string; error?: unknown }> = {
  login:       () => userLoggedIn({ id: 1 }),
  logout:      () => userLoggedOut(),
  userreject:  () => userFetchRejected('user 404'),
  otherreject: () => otherRejected('posts 500'),
  random:      () => randomAction('hello'),
}

document.querySelectorAll<HTMLButtonElement>('[data-do]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const action = DISPATCHES[btn.dataset.do!]()
    currEl.textContent = JSON.stringify(action).slice(0, 80)

    resetMarks()
    store.dispatch(action)
    con.action(action)

    setTimeout(() => checkSteps(action), 80)
  })
})

render()
con.log('Кликайте dispatch-кнопки и следите за подсветкой шагов 1-5.')
con.info('Для user actions активируются и addCase, и addMatcher. Для других — только addMatcher или defaultCase.')
