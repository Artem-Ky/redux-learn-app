import {
  configureStore,
  createEntityAdapter,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface Book {
  isbn: string // кастомный id
  title: string
  author: string
  price: number
}

// Два интересных поля: selectId + sortComparer
const booksAdapter = createEntityAdapter<Book, string>({
  selectId: (b) => b.isbn,
  sortComparer: (a, b) => a.title.localeCompare(b.title, 'en', { sensitivity: 'base' }),
})

const SEED: Book[] = [
  { isbn: '978-0-13', title: 'Clean Code', author: 'Martin', price: 35 },
  { isbn: '978-0-14', title: 'Refactoring', author: 'Fowler', price: 40 },
  { isbn: '978-0-15', title: 'Domain-Driven Design', author: 'Evans', price: 55 },
  { isbn: '978-0-16', title: 'Patterns of Enterprise App', author: 'Fowler', price: 45 },
]

const booksSlice = createSlice({
  name: 'books',
  initialState: booksAdapter.getInitialState(undefined, SEED),
  reducers: {
    bookAdded: booksAdapter.addOne,
    booksAddedMany: booksAdapter.addMany,
    bookRemoved: booksAdapter.removeOne,
    bookUpdated: (state, action: PayloadAction<{ isbn: string; title: string }>) => {
      booksAdapter.updateOne(state, {
        id: action.payload.isbn,
        changes: { title: action.payload.title },
      })
    },
    reset: () => booksAdapter.getInitialState(undefined, SEED),
  },
})

const { bookAdded, booksAddedMany, bookRemoved, bookUpdated, reset } = booksSlice.actions
const store = configureStore({ reducer: { books: booksSlice.reducer } })

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог selectId + sortComparer',
)
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const booksSelectors = booksAdapter.getSelectors<ReturnType<typeof store.getState>>(
  (s) => s.books,
)

// ── DOM ────────────────────────────────────────────
const fTitle = document.getElementById('f-title') as HTMLInputElement
const fAuthor = document.getElementById('f-author') as HTMLInputElement
const fPrice = document.getElementById('f-price') as HTMLInputElement
const uIsbn = document.getElementById('u-isbn') as HTMLSelectElement
const uTitle = document.getElementById('u-title') as HTMLInputElement
const listEl = document.getElementById('list')!
const legendEl = document.getElementById('legend')!

function escape(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))
}

let prevIds: string[] = []

function render(): void {
  const all = booksSelectors.selectAll(store.getState())
  const ids = booksSelectors.selectIds(store.getState())

  // обновить select
  uIsbn.innerHTML = ''
  for (const b of all) {
    const opt = document.createElement('option')
    opt.value = b.isbn
    opt.textContent = `${b.isbn} — ${b.title}`
    uIsbn.appendChild(opt)
  }

  // подсветим те, у которых изменилась позиция
  const moved = new Set<string>()
  ids.forEach((id, i) => {
    const prevIdx = prevIds.indexOf(id)
    if (prevIdx !== -1 && prevIdx !== i) moved.add(id)
  })

  listEl.innerHTML = ''
  all.forEach((b, i) => {
    const row = document.createElement('div')
    row.className = 'book-item' + (moved.has(b.isbn) ? ' flash' : '')
    row.innerHTML = `
      <div class="book-item__pos">${i + 1}.</div>
      <div class="book-item__title">${escape(b.title)}</div>
      <div class="book-item__author">${escape(b.author)}</div>
      <div class="book-item__price">$${b.price}</div>
      <div class="book-item__isbn">${escape(b.isbn)}</div>
      <button class="book-item__del" data-isbn="${b.isbn}">×</button>
    `
    listEl.appendChild(row)
  })
  listEl.querySelectorAll<HTMLButtonElement>('[data-isbn]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const a = bookRemoved(btn.dataset.isbn!)
      store.dispatch(a)
      con.action(a)
    })
  })

  legendEl.innerHTML =
    `ids = [${ids.map((i) => `"${i}"`).join(', ')}] — отсортирован по title (lexical).`

  prevIds = [...ids]

  setTimeout(() => {
    listEl.querySelectorAll('.flash').forEach((el) => el.classList.remove('flash'))
  }, 600)
}
render()
store.subscribe(render)

// ── handlers ───────────────────────────────────────
let randomCounter = 100
document.getElementById('add-one')!.addEventListener('click', () => {
  const isbn = `978-0-${++randomCounter}`
  const b: Book = {
    isbn,
    title: fTitle.value.trim() || 'Untitled ' + randomCounter,
    author: fAuthor.value.trim() || 'Anon',
    price: Number(fPrice.value) || 10,
  }
  const a = bookAdded(b)
  store.dispatch(a)
  con.action(a, 'addOne')
  con.info(`binary search → вставили в отсортированное ids позицию. title="${b.title}"`)
})

document.getElementById('add-random')!.addEventListener('click', () => {
  const titles = ['Algorithms', 'The Pragmatic Programmer', 'Mythical Man-Month', 'Compilers']
  const batch: Book[] = titles.map((t) => ({
    isbn: `978-0-${++randomCounter}`,
    title: t + ' #' + randomCounter,
    author: 'Random',
    price: 10 + Math.floor(Math.random() * 40),
  }))
  const a = booksAddedMany(batch)
  store.dispatch(a)
  con.action(a, 'addMany')
  con.info('addMany — все 4 пройдут через mergeFunction → sort → областная пересборка ids.')
})

document.getElementById('reset')!.addEventListener('click', () => {
  randomCounter = 100
  store.dispatch(reset())
  con.log('reset')
})

document.getElementById('do-update')!.addEventListener('click', () => {
  if (!uIsbn.value) return
  const newTitle = uTitle.value.trim()
  if (!newTitle) {
    con.warn('Введи новый title.')
    return
  }
  const a = bookUpdated({ isbn: uIsbn.value, title: newTitle })
  store.dispatch(a)
  con.action(a, 'updateOne(title)')
  con.info(`updateOne изменил title → mergeFunction пересортировал ids. Подсвечены переместившиеся.`)
  uTitle.value = ''
})

con.log("createEntityAdapter<Book, string>({ selectId: b => b.isbn, sortComparer: by title })")
con.info('selectId: ключ в entities — isbn, не id. ids — массив isbn\'ов.')
con.info('sortComparer: любой add/update поддерживает ids отсортированным.')
