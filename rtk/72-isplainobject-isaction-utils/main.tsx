import {
  configureStore,
  createSlice,
  isPlainObject,
  isAction,
  miniSerializeError,
  Tuple,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── Минимальный store — просто чтобы DevTools-панель было к чему подключить
const slice = createSlice({
  name: 'demo',
  initialState: { lastCase: '' },
  reducers: {
    casePicked: (s, a: { type: string; payload: string }) => {
      s.lastCase = a.payload
    },
  },
})
const { casePicked } = slice.actions
const store = configureStore({ reducer: { demo: slice.reducer } })

// ── DOM ────────────────────────────────────────────────────────────
const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог утилит RTK')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

// ── Формат результата ─────────────────────────────────────────────
function fmtBool(v: boolean): string {
  return v ? '<span class="v-true">true</span>' : '<span class="v-false">false</span>'
}
function fmtJSON(v: unknown): string {
  try {
    const s = JSON.stringify(v, null, 2)
    return s
      .replace(/"([^"]+)":/g, '<span class="k">"$1"</span>:')
      .replace(/: "([^"]*)"/g, ': <span class="v-str">"$1"</span>')
      .replace(/: (true|false)/g, (_, b) => `: <span class="v-${b === 'true' ? 'true' : 'false'}">${b}</span>`)
  } catch {
    return String(v)
  }
}
function writeResult(utilId: string, caseLabel: string, valueHtml: string): void {
  const box = document.getElementById(`res-${utilId}`)!
  box.innerHTML =
    `<strong style="color: var(--accent-cyan)">${utilId}</strong>: ` +
    `<span style="color: var(--text-muted)">${caseLabel}</span>\n` +
    `→ ${valueHtml}`
}

// ── isPlainObject ──────────────────────────────────────────────────

class Foo {
  a = 1
}

const isPlainCases: Record<string, [string, unknown]> = {
  obj: ['{ a: 1 }', { a: 1 }],
  array: ['[1, 2, 3]', [1, 2, 3]],
  null: ['null', null],
  undefined: ['undefined', undefined],
  map: ['new Map()', new Map()],
  set: ['new Set()', new Set()],
  date: ['new Date()', new Date()],
  createNull: ['Object.create(null)', Object.create(null) as object],
  classInst: ['new Foo()', new Foo()],
  number: ['42', 42],
}

// ── isAction ───────────────────────────────────────────────────────
class ClassAction {
  constructor(public type: string) {}
}
const isActionCases: Record<string, [string, unknown]> = {
  simple: ["{ type: 'INC' }", { type: 'INC' }],
  payload: ["{ type: 'X', payload: 1 }", { type: 'X', payload: 1 }],
  empty: ['{}', {}],
  noType: ["{ foo: 'bar' }", { foo: 'bar' }],
  typeNum: ['{ type: 42 }', { type: 42 }],
  classAction: ["new ClassAction('X')", new ClassAction('X')],
}

// ── miniSerializeError ──────────────────────────────────────────────
const miniCases: Record<string, [string, () => unknown]> = {
  error: ["new Error('boom')", () => new Error('boom')],
  typeError: ["new TypeError('nope')", () => new TypeError('nope')],
  string: ["'some string'", () => 'some string'],
  number: ['42', () => 42],
  null: ['null', () => null],
  custom: ['{name,message,code,extra:42}', () => ({
    name: 'CustomError',
    message: 'mm',
    code: 'E_WHATEVER',
    extra: 42,
    nested: { x: 1 },
  })],
  errorWithCode: ['Error + .code + .custom', () => {
    const e = new Error('net down') as Error & { code?: string; userId?: number }
    e.code = 'ECONNREFUSED'
    e.userId = 777 // не-whitelist, не-string ⇒ отпадёт
    return e
  }],
}

// ── Tuple ───────────────────────────────────────────────────────────
const tupleCases: Record<string, [string, () => string]> = {
  new: ['new Tuple(1, 2, 3)', () => {
    const t = new Tuple(1, 2, 3)
    return fmtJSON({
      value: Array.from(t),
      isArray: Array.isArray(t),
      isTuple: t instanceof Tuple,
      length: t.length,
    })
  }],
  concat: ['t1.concat(t2)', () => {
    const t1 = new Tuple(1, 2, 3)
    const t2 = new Tuple(4, 5)
    const merged = t1.concat(t2)
    return fmtJSON({
      result: Array.from(merged),
      isTuple: merged instanceof Tuple,
      isPlainArray: !(merged instanceof Tuple),
    })
  }],
  prepend: ['new Tuple(3,4).prepend([1,2])', () => {
    const t = new Tuple(3, 4).prepend([1, 2])
    return fmtJSON({
      result: Array.from(t),
      isTuple: t instanceof Tuple,
    })
  }],
  species: ['t.map(x => x*2) instanceof Tuple?', () => {
    const t = new Tuple(1, 2, 3)
    const mapped = t.map((x) => x * 2)
    return fmtJSON({
      mapped: Array.from(mapped),
      isTuple: mapped instanceof Tuple,
      explain: 'Tuple переопределяет Symbol.species ⇒ map тоже возвращает Tuple',
    })
  }],
  vsArray: ['[1,2].concat([3,4])', () => {
    const a = [1, 2].concat([3, 4])
    return fmtJSON({
      result: a,
      isTuple: a instanceof Tuple,
      isArray: Array.isArray(a),
      note: 'обычный Array остаётся Array — в этом вся разница с Tuple',
    })
  }],
}

// ── Wire buttons ───────────────────────────────────────────────────

function pickCase(utilId: string, caseId: string): void {
  store.dispatch(casePicked(`${utilId}/${caseId}`))

  if (utilId === 'isPlainObject') {
    const [label, value] = isPlainCases[caseId]
    const result = isPlainObject(value)
    writeResult(utilId, label, fmtBool(result))
    con.info(`isPlainObject(${label}) = ${result}`)
    return
  }
  if (utilId === 'isAction') {
    const [label, value] = isActionCases[caseId]
    const result = isAction(value)
    writeResult(utilId, label, fmtBool(result))
    con.info(`isAction(${label}) = ${result}`)
    return
  }
  if (utilId === 'miniSerializeError') {
    const [label, factory] = miniCases[caseId]
    const input = factory()
    const result = miniSerializeError(input)
    writeResult(utilId, label, fmtJSON(result))
    con.info(`miniSerializeError(${label}) → ${JSON.stringify(result)}`)
    return
  }
  if (utilId === 'Tuple') {
    const [label, runner] = tupleCases[caseId]
    const rendered = runner()
    writeResult(utilId, label, rendered)
    con.info(`Tuple: ${label}`)
    return
  }
}

document.querySelectorAll<HTMLElement>('.case-grid').forEach((grid) => {
  const utilId = grid.getAttribute('data-util')!
  grid.querySelectorAll<HTMLButtonElement>('.case-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const caseId = btn.getAttribute('data-case')!
      pickCase(utilId, caseId)
    })
  })
})

document.getElementById('run-all')!.addEventListener('click', () => {
  con.warn('Прогоняю все кейсы подряд')
  for (const [k] of Object.entries(isPlainCases)) pickCase('isPlainObject', k)
  for (const [k] of Object.entries(isActionCases)) pickCase('isAction', k)
  for (const [k] of Object.entries(miniCases)) pickCase('miniSerializeError', k)
  for (const [k] of Object.entries(tupleCases)) pickCase('Tuple', k)
  con.success('Все кейсы прогнаны — каждая карточка показывает последний результат.')
})

document.getElementById('clear-results')!.addEventListener('click', () => {
  ;['isPlainObject', 'isAction', 'miniSerializeError', 'Tuple'].forEach((u) => {
    document.getElementById(`res-${u}`)!.textContent = '—'
  })
  con.info('Результаты очищены')
})

con.log('isPlainObject: обрати внимание на Object.create(null) → true, и new Foo() → false.')
con.log('isAction: type обязательно string — type: 42 даёт false.')
con.log('miniSerializeError: только whitelist name/message/stack/code; extra поля отбрасываются.')
con.log('Tuple: instance-проверка после map/concat/prepend — всегда Tuple (через Symbol.species).')
