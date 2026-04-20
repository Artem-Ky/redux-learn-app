import {
  configureStore,
  createAction,
  createReducer,
  current,
  original,
  isDraft,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface State {
  value: number
  items: number[]
  count: number
}

const initial: State = { value: 0, items: [], count: 0 }

const mixAct = createAction('demo/mix')
const revokedAct = createAction('demo/revoked')
const nullReturnAct = createAction('demo/nullReturn')
const currOrigAct = createAction('demo/currOrig')
const logAct = createAction('demo/log')
const isDraftAct = createAction('demo/isDraft')

let savedDraft: unknown = null
let lastError = ''
let lastInfo = ''

const reducer = createReducer<State>(initial, (b) => {
  b.addCase(mixAct, (state) => {
    state.value += 1
    return { ...state, value: state.value + 100 } as State
  })
   .addCase(revokedAct, (state) => {
     savedDraft = state
   })
   .addCase(nullReturnAct, (state) => {
     state.value = 999
     return null as unknown as State
   })
   .addCase(currOrigAct, (state) => {
     state.count = 10
     const orig1 = original(state.count)
     const cur1 = current(state.count)
     state.count = 20
     const orig2 = original(state.count)
     const cur2 = current(state.count)
     lastInfo = JSON.stringify({
       'after =10 → original': orig1,
       'after =10 → current': cur1,
       'after =20 → original': orig2,
       'after =20 → current': cur2,
     }, null, 2)
   })
   .addCase(logAct, (state) => {
     state.value += 1
     const proxyView = String(state)
     const safeView = JSON.stringify(current(state), null, 2)
     lastInfo = `Прямо: ${proxyView}\nЧерез current(): ${safeView}`
   })
   .addCase(isDraftAct, (state) => {
     const inside = isDraft(state)
     const insideValue = isDraft(state.items)
     lastInfo = `isDraft(state) внутри reducer'а = ${inside}\nisDraft(state.items)         = ${insideValue}`
   })
})

const store = configureStore({
  reducer,
  middleware: (gdm) => gdm({
    immutableCheck: false,
    serializableCheck: false,
  }),
})

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог Immer pitfalls')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

function show(id: string, text: string, ok = false): void {
  const el = document.getElementById(id)!
  el.textContent = text
  el.style.color = ok ? 'var(--success)' : 'var(--accent-cyan)'
}

function tryDispatch(action: { type: string }, outId: string, label: string): void {
  lastError = ''
  lastInfo = ''
  try {
    store.dispatch(action)
    con.action(action)
  } catch (e) {
    lastError = (e as Error).message
  }

  const outsideIsDraft = savedDraft !== null ? (() => {
    try { return isDraft(savedDraft) } catch (e) { return `error: ${(e as Error).message.slice(0, 60)}` }
  })() : null

  const lines: string[] = []
  if (lastError) lines.push(`ERROR: ${lastError}`)
  if (lastInfo) lines.push(lastInfo)
  if (outsideIsDraft !== null && action.type === 'demo/revoked') {
    lines.push(`isDraft(savedDraft) после reducer'а: ${outsideIsDraft}`)
    try {
      const v = (savedDraft as { value: number }).value
      lines.push(`savedDraft.value читается? ${v}`)
    } catch (e) {
      lines.push(`savedDraft.value: ${(e as Error).message.slice(0, 100)}`)
    }
  }
  if (lines.length === 0) lines.push(`OK — state.value = ${store.getState().value}`)

  show(outId, `[${label}]\n${lines.join('\n')}`, !lastError)

  if (action.type === 'demo/revoked') {
    try {
      (savedDraft as { value: number }).value = 5
    } catch (e) {
      con.warn(`Попытка savedDraft.value = 5 после reducer'а: ${(e as Error).message.slice(0, 100)}`)
    }
  }
}

const ACTS: Record<string, () => void> = {
  mix:         () => tryDispatch(mixAct(),         'mix-out',     'mutate + return'),
  revoked:     () => tryDispatch(revokedAct(),     'revoked-out', 'save draft outside'),
  'null-return': () => tryDispatch(nullReturnAct(), 'null-out',   'mutate + return null'),
  'curr-orig': () => tryDispatch(currOrigAct(),    'co-out',      'current vs original'),
  log:         () => tryDispatch(logAct(),         'log-out',     'console.log(state)'),
  isdraft:     () => tryDispatch(isDraftAct(),     'isdraft-out', 'isDraft check'),
}

document.querySelectorAll<HTMLButtonElement>('[data-act]').forEach((btn) => {
  btn.addEventListener('click', () => ACTS[btn.dataset.act!]())
})

con.log('6 типичных грабель Immer + 1 helper (isDraft).')
con.warn('Если видите ошибку с "revoked proxy" или "modified its draft" — это нормально, мы это и демонстрируем.')
con.success('Запомните правило: ИЛИ мутируйте draft, ИЛИ return — но не оба сразу.')
