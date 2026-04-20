import { configureStore, createAction, createReducer } from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface State {
  counter: { value: number }
  user: { name: string; age: number }
  tags: string[]
  items: { ids: string[]; byId: Record<string, unknown> }
}

const initial: State = {
  counter: { value: 0 },
  user: { name: 'Alice', age: 30 },
  tags: ['a', 'b'],
  items: { ids: [], byId: {} },
}

const inc = createAction('inc')
const rename = createAction('rename')
const pushTag = createAction('pushTag')
const noop = createAction('noop')

const reducer = createReducer<State>(initial, (b) => {
  b.addCase(inc, (s) => { s.counter.value += 1 })
   .addCase(rename, (s) => { s.user.name = 'Bob' })
   .addCase(pushTag, (s) => { s.tags.push('c') })
   .addCase(noop, () => { /* nothing */ })
})

const store = configureStore({ reducer })

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог Immer')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const refsEl = document.getElementById('refs-out')!
const jsonEl = document.getElementById('state-json')!

function renderJson(): void {
  jsonEl.textContent = JSON.stringify(store.getState(), null, 2)
}

function compareRefs(before: State, after: State): void {
  const rows: string[] = []
  const keys: (keyof State)[] = ['counter', 'user', 'tags', 'items']
  keys.forEach((k) => {
    const same = before[k] === after[k]
    rows.push(
      `<div class="row"><span>state.${k}</span><span class="${same ? 'yes' : 'no'}">${same ? '✓ same ref' : '✗ new ref'}</span></div>`
    )
  })

  const rootSame = (before as unknown) === (after as unknown)
  rows.unshift(
    `<div class="row"><span>state (root)</span><span class="${rootSame ? 'yes' : 'no'}">${rootSame ? '✓ same ref' : '✗ new ref'}</span></div>`
  )
  refsEl.innerHTML = rows.join('')
}

renderJson()

const ACTS: Record<string, () => { type: string }> = {
  inc:    () => inc(),
  rename: () => rename(),
  push:   () => pushTag(),
  noop:   () => noop(),
}

document.querySelectorAll<HTMLButtonElement>('[data-act]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const before = store.getState()
    const a = ACTS[btn.dataset.act!]()
    store.dispatch(a)
    const after = store.getState()
    compareRefs(before, after)
    renderJson()
    con.action(a)
    con.info(`state === state'before = ${(before as unknown) === (after as unknown)}`)
  })
})

con.log('Immer использует Proxy над state. При мутации draft обновляются только modified-ветки.')
con.info('Structural sharing: ветки, которые вы НЕ трогали, остаются с той же ссылкой.')
con.success('Это критично для React-Redux: селекторы не триггерят лишние ре-рендеры.')
