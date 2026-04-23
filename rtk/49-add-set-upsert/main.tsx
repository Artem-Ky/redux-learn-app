import {
  configureStore,
  createEntityAdapter,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface Book {
  id: string
  title: string
  price: number
  author: string
}

const booksAdapter = createEntityAdapter<Book>()

const INITIAL: Book = { id: 'a', title: 'A', price: 10, author: 'Knuth' }

const booksSlice = createSlice({
  name: 'books',
  initialState: booksAdapter.getInitialState(undefined, [INITIAL]),
  reducers: {
    doAdd: (state, action: PayloadAction<Partial<Book> & { id: string }>) => {
      booksAdapter.addOne(state, action.payload as Book)
    },
    doSet: (state, action: PayloadAction<Partial<Book> & { id: string }>) => {
      booksAdapter.setOne(state, action.payload as Book)
    },
    doUpsert: (state, action: PayloadAction<Partial<Book> & { id: string }>) => {
      booksAdapter.upsertOne(state, action.payload as Book)
    },
    reset: () => booksAdapter.getInitialState(undefined, [INITIAL]),
  },
})

const { doAdd, doSet, doUpsert, reset } = booksSlice.actions
const store = configureStore({ reducer: { books: booksSlice.reducer } })

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог add/set/upsert',
)
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

// ── DOM ────────────────────────────────────────────
const pId = document.getElementById('p-id') as HTMLInputElement
const pPrice = document.getElementById('p-price') as HTMLInputElement
const pTitle = document.getElementById('p-title') as HTMLInputElement
const paneBefore = document.getElementById('pane-before')!
const paneAfter = document.getElementById('pane-after')!
const lastAction = document.getElementById('last-action')!

let beforeSnapshot: Record<string, Book> | null = null

function renderPanes(before: Record<string, Book> | null, after: Record<string, Book>): void {
  if (!before) {
    paneBefore.textContent = '—'
    paneAfter.textContent = JSON.stringify(after, null, 2)
    return
  }
  paneBefore.textContent = JSON.stringify(before, null, 2)

  // highlight-diff
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  const lines: string[] = []
  lines.push('{')
  for (const k of keys) {
    const bBefore = before[k]
    const bAfter = after[k]
    if (!bBefore && bAfter) {
      lines.push(`  <span class="highlighted-add">"${k}": ${JSON.stringify(bAfter)}</span>,`)
    } else if (bBefore && !bAfter) {
      lines.push(`  <span class="highlighted-diff">(удалён) "${k}": ${JSON.stringify(bBefore)}</span>,`)
    } else if (bBefore && bAfter) {
      // diff fields
      const fieldKeys = new Set([...Object.keys(bBefore), ...Object.keys(bAfter)])
      lines.push(`  "${k}": {`)
      for (const fk of fieldKeys) {
        const v1 = (bBefore as unknown as Record<string, unknown>)[fk]
        const v2 = (bAfter as unknown as Record<string, unknown>)[fk]
        if (v1 === undefined && v2 !== undefined) {
          lines.push(`    <span class="highlighted-add">"${fk}": ${JSON.stringify(v2)}</span>,`)
        } else if (v1 !== undefined && v2 === undefined) {
          lines.push(`    <span class="highlighted-diff">"${fk}": (БЫЛО ${JSON.stringify(v1)} → НЕТ)</span>,`)
        } else if (v1 !== v2) {
          lines.push(`    <span class="highlighted-add">"${fk}": ${JSON.stringify(v2)}</span>,`)
        } else {
          lines.push(`    "${fk}": ${JSON.stringify(v2)},`)
        }
      }
      lines.push(`  },`)
    }
  }
  lines.push('}')
  paneAfter.innerHTML = lines.join('\n')
}

function snapshotBefore(): void {
  beforeSnapshot = JSON.parse(
    JSON.stringify(store.getState().books.entities),
  ) as Record<string, Book>
}

function render(): void {
  const s = store.getState().books
  renderPanes(beforeSnapshot, s.entities as Record<string, Book>)
}

render()
store.subscribe(render)

// ── payload builder ────────────────────────────────
function buildPayload(): Partial<Book> & { id: string } {
  const payload: Partial<Book> & { id: string } = {
    id: pId.value.trim() || 'a',
    price: Number(pPrice.value),
  }
  if (pTitle.value.trim()) payload.title = pTitle.value.trim()
  return payload
}

// ── кнопки ─────────────────────────────────────────
document.getElementById('do-add')!.addEventListener('click', () => {
  snapshotBefore()
  const payload = buildPayload()
  const a = doAdd(payload)
  store.dispatch(a)
  con.action(a, 'addOne')

  if (Object.prototype.hasOwnProperty.call(store.getState().books.entities, payload.id)
      && beforeSnapshot && Object.prototype.hasOwnProperty.call(beforeSnapshot, payload.id)) {
    con.warn(`addOne: entity с id='${payload.id}' уже существует → no-op (state не изменился)`)
    lastAction.textContent = `addOne({ id: '${payload.id}' }) — уже существует, изменений нет.`
  } else {
    con.success(`addOne: добавили '${payload.id}'`)
    lastAction.textContent = `addOne({ id: '${payload.id}' }) — добавили новую запись.`
  }
})

document.getElementById('do-set')!.addEventListener('click', () => {
  snapshotBefore()
  const payload = buildPayload()
  const a = doSet(payload)
  store.dispatch(a)
  con.action(a, 'setOne')
  con.warn(`setOne: entity полностью заменён. Поля, которых нет в payload — ПОТЕРЯНЫ.`)
  lastAction.textContent = `setOne({ id: '${payload.id}' }) — REPLACE. Красным в diff'е — поля, которые теперь undefined.`
})

document.getElementById('do-upsert')!.addEventListener('click', () => {
  snapshotBefore()
  const payload = buildPayload()
  const a = doUpsert(payload)
  store.dispatch(a)
  con.action(a, 'upsertOne')
  con.info('upsertOne: Object.assign({}, original, payload) — shallow merge на верхнем уровне.')
  lastAction.textContent = `upsertOne({ id: '${payload.id}' }) — merge сверху: title и author остались.`
})

document.getElementById('reset')!.addEventListener('click', () => {
  beforeSnapshot = null
  store.dispatch(reset())
  lastAction.textContent = ''
  con.log('reset: state = { ids:["a"], entities:{a:{…}} }')
})

con.log("Стартовый state: entities.a = { id:'a', title:'A', price:10, author:'Knuth' }")
con.info('Попробуй: payload = { id:"a", price:20 } и три кнопки — сравни diff.')
con.info('addOne: ничего, setOne: title/author потеряны, upsertOne: только price меняется.')
