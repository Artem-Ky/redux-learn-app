import {
  configureStore,
  createEntityAdapter,
  createSlice,
  nanoid,
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

// 1) adapter: дефолтный selectId (b) => b.id
const booksAdapter = createEntityAdapter<Book>()

// 2) начальный state = { ids: [], entities: {} }
const initialState = booksAdapter.getInitialState()

// 3) slice с adapter-методами как reducer'ами
const booksSlice = createSlice({
  name: 'books',
  initialState,
  reducers: {
    // adapter-методы сами — готовые reducers
    bookAdded: booksAdapter.addOne,
    booksAddedMany: booksAdapter.addMany,
    booksSetAll: booksAdapter.setAll,
    bookRemoved: booksAdapter.removeOne,
    booksRemovedAll: booksAdapter.removeAll,
    bookUpserted: booksAdapter.upsertOne,

    // пример кастомного reducer'а с prepare
    bookAddedWithPrepare: {
      reducer: (state, action: PayloadAction<Book>) => {
        booksAdapter.addOne(state, action.payload)
      },
      prepare: (title: string, price: number, author: string) => ({
        payload: { id: nanoid(), title, price, author } as Book,
      }),
    },
  },
})

const {
  bookAdded,
  booksAddedMany,
  booksSetAll,
  bookRemoved,
  booksRemovedAll,
  bookUpserted,
  bookAddedWithPrepare,
} = booksSlice.actions

const store = configureStore({ reducer: { books: booksSlice.reducer } })

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог CRUD через adapter',
)
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

// ── селекторы ──────────────────────────────────────
const booksSelectors = booksAdapter.getSelectors<ReturnType<typeof store.getState>>(
  (s) => s.books,
)

// ── DOM ────────────────────────────────────────────
const fId = document.getElementById('f-id') as HTMLInputElement
const fTitle = document.getElementById('f-title') as HTMLInputElement
const fPrice = document.getElementById('f-price') as HTMLInputElement
const fAuthor = document.getElementById('f-author') as HTMLInputElement
const listEl = document.getElementById('list')!
const idsPane = document.getElementById('ids-pane')!
const entPane = document.getElementById('ent-pane')!

function render(): void {
  const all = booksSelectors.selectAll(store.getState())
  const ids = booksSelectors.selectIds(store.getState())
  const entities = booksSelectors.selectEntities(store.getState())

  if (all.length === 0) {
    listEl.innerHTML = '<div style="color: var(--text-muted); padding: 10px;">— пусто —</div>'
  } else {
    listEl.innerHTML = ''
    for (const b of all) {
      const row = document.createElement('div')
      row.className = 'book-row'
      row.innerHTML = `
        <div class="book-row__id">#${b.id.slice(0, 4)}</div>
        <div class="book-row__title">${escape(b.title)}</div>
        <div class="book-row__price">$${b.price}</div>
        <div class="book-row__author">${escape(b.author)}</div>
        <button class="book-row__del" data-id="${b.id}">×</button>
      `
      listEl.appendChild(row)
    }
    listEl.querySelectorAll<HTMLButtonElement>('[data-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const a = bookRemoved(btn.dataset.id!)
        store.dispatch(a)
        con.action(a)
      })
    })
  }

  idsPane.textContent = JSON.stringify(ids, null, 2)
  entPane.textContent = JSON.stringify(entities, null, 2)
}
render()
store.subscribe(render)

// helper
function escape(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))
}

// ── кнопки ──────────────────────────────────────────
document.getElementById('add-one')!.addEventListener('click', () => {
  const id = fId.value.trim() || nanoid()
  const title = fTitle.value.trim() || 'Untitled'
  const price = Number(fPrice.value) || 0
  const author = fAuthor.value.trim() || 'Anon'
  const a = bookAdded({ id, title, price, author })
  store.dispatch(a)
  con.action(a, 'addOne')
  fId.value = ''
  fTitle.value = ''
  fAuthor.value = ''
})

document.getElementById('add-many')!.addEventListener('click', () => {
  const batch: Book[] = [
    { id: nanoid(), title: 'Clean Code', price: 35, author: 'Martin' },
    { id: nanoid(), title: 'Refactoring', price: 40, author: 'Fowler' },
    { id: nanoid(), title: 'DDD', price: 55, author: 'Evans' },
  ]
  const a = booksAddedMany(batch)
  store.dispatch(a)
  con.action(a, 'addMany')
  con.info(`Добавили ${batch.length}. ids синхронно обновились, entities тоже.`)
})

document.getElementById('set-all')!.addEventListener('click', () => {
  const batch: Book[] = [
    { id: 'b1', title: 'SICP', price: 50, author: 'Abelson' },
    { id: 'b2', title: 'CLRS', price: 90, author: 'Cormen' },
    { id: 'b3', title: 'TAOCP vol 1', price: 70, author: 'Knuth' },
    { id: 'b4', title: 'The Pragmatic Programmer', price: 38, author: 'Hunt' },
    { id: 'b5', title: 'Effective TypeScript', price: 44, author: 'Vanderkam' },
  ]
  const a = booksSetAll(batch)
  store.dispatch(a)
  con.action(a, 'setAll')
  con.warn('setAll стирает всё и записывает новое — ids/entities полностью пересобираются.')
})

document.getElementById('upsert')!.addEventListener('click', () => {
  const a = bookUpserted({ id: 'upd', title: 'Upserted book', price: 100, author: 'RTK' })
  store.dispatch(a)
  con.action(a, 'upsertOne')
  con.info('upsertOne: если id нет — addOne, если есть — merge полей (shallow). См. урок 49.')
})

document.getElementById('remove-all')!.addEventListener('click', () => {
  const a = booksRemovedAll()
  store.dispatch(a)
  con.action(a, 'removeAll')
})

document.getElementById('remove-random')!.addEventListener('click', () => {
  const ids = booksSelectors.selectIds(store.getState())
  if (ids.length === 0) {
    con.warn('Нечего удалять.')
    return
  }
  const victim = ids[Math.floor(Math.random() * ids.length)]
  const a = bookRemoved(victim)
  store.dispatch(a)
  con.action(a, 'removeOne (random)')
})

// стартовые данные
store.dispatch(
  bookAddedWithPrepare('Redux in Action', 32, 'Abramov (not really)'),
)
store.dispatch(bookAddedWithPrepare('Learning Redux', 28, 'Ali'))

con.log('booksAdapter = createEntityAdapter<Book>() — дефолтный selectId.')
con.info('getInitialState() → { ids: [], entities: {} }')
con.success('Попробуй add → add тот же id (игнор) → setAll (полный reset) → upsert.')
