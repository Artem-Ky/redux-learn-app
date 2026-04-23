import {
  configureStore,
  createSlice,
  createSelector,
  createDraftSafeSelector,
  nanoid,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── Types ─────────────────────────────────────────────────────────

interface Book { id: string; title: string; price: number }

interface ProbeSnap {
  unsafe: number
  safe: number
  truth: number
}
interface Probe {
  ran: boolean
  itemsRefSame: boolean // state.items === itemsRefBefore?
  before: ProbeSnap
  after: ProbeSnap
}
interface BooksState {
  items: Book[]
  probe: Probe
}

// ── Selectors ─────────────────────────────────────────────────────

// 1. Обычный createSelector → дефолтный lruMemoize(size: 1).
//    Кеширует input-ссылки. Второй вызов с тем же Proxy state.items → HIT → stale.
let unsafeComputeCount = 0
const selectAvgPriceUnsafe = createSelector(
  [(s: BooksState) => s.items],
  (items): number => {
    unsafeComputeCount += 1
    if (!items.length) return 0
    return Math.round(items.reduce((acc, b) => acc + b.price, 0) / items.length)
  },
)

// 2. createDraftSafeSelector → unwrap draft через current() → всегда plain snapshot → всегда cache miss.
let safeComputeCount = 0
const selectAvgPriceSafe = createDraftSafeSelector(
  [(s: BooksState) => s.items],
  (items): number => {
    safeComputeCount += 1
    if (!items.length) return 0
    return Math.round(items.reduce((acc, b) => acc + b.price, 0) / items.length)
  },
)

// «Правда» — честно пробежать по items без мемоизации.
function truthAvg(items: Book[]): number {
  if (!items.length) return 0
  return Math.round(items.reduce((a, b) => a + b.price, 0) / items.length)
}

// ── Slice ─────────────────────────────────────────────────────────

const seed = (): Book[] => [
  { id: nanoid(), title: 'Redux в деталях', price: 400 },
  { id: nanoid(), title: 'TypeScript в действии', price: 500 },
  { id: nanoid(), title: 'React глубоко', price: 600 },
]

const emptyProbe: Probe = {
  ran: false,
  itemsRefSame: false,
  before: { unsafe: 0, safe: 0, truth: 0 },
  after: { unsafe: 0, safe: 0, truth: 0 },
}

const booksSlice = createSlice({
  name: 'books',
  initialState: { items: seed(), probe: emptyProbe } as BooksState,

  reducers: {
    // Ключевой reducer: делает 3 шага внутри одной produce'овой транзакции:
    //   t0: снять показания обоих селекторов.
    //   t1: мутировать цены (+100 каждой). items — ТОТ ЖЕ Proxy, только значения под ним поменяны.
    //   t2: снова снять показания.
    // Обычный createSelector получит cache HIT (тот же Proxy items) и вернёт stale.
    // createDraftSafeSelector каждый раз делает current(state) → свежий plain snapshot → cache MISS.
    runProbe: (state) => {
      const itemsRefBefore = state.items // ссылка на draft proxy items

      state.probe.before.unsafe = selectAvgPriceUnsafe(state)
      state.probe.before.safe = selectAvgPriceSafe(state)
      state.probe.before.truth = truthAvg(state.items)

      // Мутация без подмены массива — именно здесь рождается stale-баг.
      state.items.forEach((b) => { b.price += 100 })

      state.probe.after.unsafe = selectAvgPriceUnsafe(state)
      state.probe.after.safe = selectAvgPriceSafe(state)
      state.probe.after.truth = truthAvg(state.items)

      state.probe.itemsRefSame = state.items === itemsRefBefore
      state.probe.ran = true
    },

    addBook: {
      prepare: (title: string, price: number) => ({
        payload: { id: nanoid(), title, price },
      }),
      reducer: (state, action: PayloadAction<Book>) => {
        state.items.push(action.payload)
      },
    },

    reset: () => ({ items: seed(), probe: emptyProbe }),
  },
})

const store = configureStore({ reducer: booksSlice.reducer })

// ── UI ────────────────────────────────────────────────────────────

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог createDraftSafeSelector',
)
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const cells = {
  uBefore: document.getElementById('u-before')!,
  uAfter: document.getElementById('u-after')!,
  sBefore: document.getElementById('s-before')!,
  sAfter: document.getElementById('s-after')!,
  tBefore: document.getElementById('t-before')!,
  tAfter: document.getElementById('t-after')!,
  uVerdict: document.getElementById('u-verdict')!,
  sVerdict: document.getElementById('s-verdict')!,
  uCount: document.getElementById('u-count')!,
  sCount: document.getElementById('s-count')!,
  itemsRef: document.getElementById('items-ref')!,
  books: document.getElementById('books-list')!,
}

function renderBooks(items: Book[]): void {
  cells.books.innerHTML = items
    .map(
      (b) => `<div class="book-row">
        <span class="book-row__title">${b.title}</span>
        <span class="book-row__price">${b.price} ₽</span>
      </div>`,
    )
    .join('')
}

function fmt(n: number): string {
  return n ? `${n} ₽` : '—'
}

function render(): void {
  const s = store.getState()
  const p = s.probe

  cells.uBefore.textContent = p.ran ? fmt(p.before.unsafe) : '—'
  cells.uAfter.textContent = p.ran ? fmt(p.after.unsafe) : '—'
  cells.sBefore.textContent = p.ran ? fmt(p.before.safe) : '—'
  cells.sAfter.textContent = p.ran ? fmt(p.after.safe) : '—'
  cells.tBefore.textContent = p.ran ? fmt(p.before.truth) : '—'
  cells.tAfter.textContent = p.ran ? fmt(p.after.truth) : '—'

  // Unsafe: «правильно» если after совпал с truth after. Ожидаемо — НЕ совпадёт (stale).
  const unsafeStale = p.ran && p.after.unsafe !== p.after.truth
  const safeFresh = p.ran && p.after.safe === p.after.truth

  cells.uAfter.classList.toggle('stale', unsafeStale)
  cells.uAfter.classList.toggle('fresh', p.ran && !unsafeStale)
  cells.sAfter.classList.toggle('fresh', safeFresh)

  cells.uVerdict.textContent = p.ran
    ? unsafeStale
      ? `❌ STALE — cache hit отдал старое значение (before===after: ${p.before.unsafe === p.after.unsafe})`
      : `✔ совпало`
    : '— запустите probe —'
  cells.uVerdict.className = 'verdict ' + (p.ran ? (unsafeStale ? 'verdict--bad' : 'verdict--good') : '')

  cells.sVerdict.textContent = p.ran
    ? safeFresh
      ? `✔ FRESH — current(draft) дал новый plain snapshot → cache miss → пересчёт`
      : `⚠ неожиданно расхождение`
    : '— запустите probe —'
  cells.sVerdict.className = 'verdict ' + (p.ran ? (safeFresh ? 'verdict--good' : 'verdict--bad') : '')

  cells.uCount.textContent = String(unsafeComputeCount)
  cells.sCount.textContent = String(safeComputeCount)

  cells.itemsRef.textContent = p.ran
    ? p.itemsRefSame
      ? 'ДА — ссылка state.items одна и та же до/после мутации'
      : 'нет — ссылка поменялась (неожиданно)'
    : '—'
  cells.itemsRef.className = 'ref-line ' + (p.ran && p.itemsRefSame ? 'ref-line--ok' : '')

  renderBooks(s.items)
}
render()
store.subscribe(render)

// ── Actions ───────────────────────────────────────────────────────

document.querySelector('[data-act="probe"]')!.addEventListener('click', () => {
  const a = booksSlice.actions.runProbe()
  store.dispatch(a)
  con.action(a)

  const p = store.getState().probe
  con.info(`t₀ BEFORE:  unsafe=${p.before.unsafe}  safe=${p.before.safe}  truth=${p.before.truth}`)
  con.warn(`t₁ MUTATE: state.items.forEach(b =&gt; b.price += 100). items — тот же Proxy.`)
  con.info(`t₂ AFTER:   unsafe=${p.after.unsafe}  safe=${p.after.safe}  truth=${p.after.truth}`)

  if (p.after.unsafe === p.before.unsafe && p.before.truth !== p.after.truth) {
    con.error(
      `❌ createSelector вернул закешированный before (${p.before.unsafe}) вместо нового after (${p.after.truth}). Это тот самый stale-bug.`,
    )
  }
  if (p.after.safe === p.after.truth && p.before.safe !== p.after.safe) {
    con.success(
      `✔ createDraftSafeSelector пересчитал: before=${p.before.safe}, after=${p.after.safe}. current(draft) сработал.`,
    )
  }
})

let addCounter = 0
const titles = ['Go за 30 дней', 'Linux в глубину', 'CSS мастер', 'Сети TCP/IP', 'Алгоритмы']
document.querySelector('[data-act="add"]')!.addEventListener('click', () => {
  addCounter += 1
  const a = booksSlice.actions.addBook(
    `${titles[addCounter % titles.length]} #${addCounter}`,
    300 + Math.floor(Math.random() * 400),
  )
  store.dispatch(a)
  con.action(a)
  con.info('Новая книга добавлена. Запустите probe, чтобы увидеть bug на актуальном списке.')
})

document.querySelector('[data-act="reset"]')!.addEventListener('click', () => {
  unsafeComputeCount = 0
  safeComputeCount = 0
  const a = booksSlice.actions.reset()
  store.dispatch(a)
  con.action(a)
  con.info('Reset: items и счётчики пересчётов обнулены.')
})

// ── Intro logs ────────────────────────────────────────────────────

con.log(
  'Сценарий probe: внутри ОДНОГО reducer\'а вызываем селектор → мутируем цены → снова вызываем.',
)
con.info(
  'Между двумя вызовами state.items === state.items (тот же draft proxy). Обычный createSelector = cache hit = stale.',
)
con.warn(
  'createDraftSafeSelector делает current(state) → новый plain объект → new items ref → cache miss → свежий пересчёт.',
)
