import {
  configureStore,
  createSlice,
  nanoid,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── Types ─────────────────────────────────────────────────────────

interface UserState { id: string; name: string }
interface Post { id: string; title: string }
interface PostsState { items: Post[] }
interface ThemeState { value: 'light' | 'dark' }
type RootState = { user: UserState; posts: PostsState; theme: ThemeState }

// ── Slices ────────────────────────────────────────────────────────

const userSlice = createSlice({
  name: 'user',
  initialState: { id: 'u-1', name: 'Alice' } as UserState,
  reducers: {
    setName: (s, a: PayloadAction<string>) => {
      // Мы намеренно НЕ проверяем s.name === payload перед присваиванием,
      // чтобы показать, как Immer всё равно корректно не пересоздаёт объект,
      // если для примитива write === read.
      s.name = a.payload
    },
  },
})

const postsSlice = createSlice({
  name: 'posts',
  initialState: {
    items: [
      { id: nanoid(), title: 'Structural sharing explained' },
      { id: nanoid(), title: 'Redux immutability rule' },
    ],
  } as PostsState,
  reducers: {
    addPost: (s, a: PayloadAction<string>) => {
      s.items.push({ id: nanoid(), title: a.payload })
    },
    editFirstTitle: (s, a: PayloadAction<string>) => {
      const first = s.items[0]
      if (first) first.title = a.payload
    },
    replaceAll: (s, a: PayloadAction<Post[]>) => {
      s.items = a.payload
    },
  },
})

const themeSlice = createSlice({
  name: 'theme',
  initialState: { value: 'dark' } as ThemeState,
  reducers: {
    toggle: (s) => {
      s.value = s.value === 'dark' ? 'light' : 'dark'
    },
  },
})

const store = configureStore({
  reducer: {
    user: userSlice.reducer,
    posts: postsSlice.reducer,
    theme: themeSlice.reducer,
  },
})

// ── UI utilities ──────────────────────────────────────────────────

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог reference equality',
)
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

// Стабильный «id» ссылки: WeakMap object → short hex.
const refIds = new WeakMap<object, string>()
let refCounter = 0
function refId(obj: unknown): string {
  if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) {
    return `prim:${String(obj)}`
  }
  const o = obj as object
  let id = refIds.get(o)
  if (!id) {
    refCounter += 1
    id = `#${refCounter.toString(16).padStart(3, '0')}`
    refIds.set(o, id)
  }
  return id
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

// ── DOM refs ──────────────────────────────────────────────────────

const rootPreviewEl = document.getElementById('root-preview')!
const rootRefidEl = document.getElementById('root-refid')!
const rootTagEl = document.getElementById('root-tag')!

const userRowEl = document.getElementById('user-row')!
const userPreviewEl = document.getElementById('user-preview')!
const userRefidEl = document.getElementById('user-refid')!
const userTagEl = document.getElementById('user-tag')!

const postsRowEl = document.getElementById('posts-row')!
const postsPreviewEl = document.getElementById('posts-preview')!
const postsRefidEl = document.getElementById('posts-refid')!
const postsTagEl = document.getElementById('posts-tag')!

const themeRowEl = document.getElementById('theme-row')!
const themePreviewEl = document.getElementById('theme-preview')!
const themeRefidEl = document.getElementById('theme-refid')!
const themeTagEl = document.getElementById('theme-tag')!

const statTotalEl = document.getElementById('stat-total')!
const statRootEl = document.getElementById('stat-root')!
const statUserEl = document.getElementById('stat-user')!
const statPostsEl = document.getElementById('stat-posts')!
const statThemeEl = document.getElementById('stat-theme')!

// ── Tracking ──────────────────────────────────────────────────────

let prev: RootState = store.getState() as RootState
let dispatches = 0
let rootChanges = 0
let userSame = 0
let postsSame = 0
let themeSame = 0

interface RowRefs {
  row: HTMLElement
  tag: HTMLElement
}
function markRow(refs: RowRefs, sliceSame: boolean): void {
  refs.row.classList.remove('tree-row--same', 'tree-row--new', 'flash-new')
  refs.tag.classList.remove('tag--same', 'tag--new')
  if (sliceSame) {
    refs.row.classList.add('tree-row--same')
    refs.tag.classList.add('tag--same')
    refs.tag.textContent = 'same'
  } else {
    refs.row.classList.add('tree-row--new')
    refs.tag.classList.add('tag--new')
    refs.tag.textContent = 'new'
    // Trigger animation.
    void refs.row.offsetWidth
    refs.row.classList.add('flash-new')
  }
}

function renderTree(next: RootState): void {
  const rootSame = next === prev
  const uSame = next.user === prev.user
  const pSame = next.posts === prev.posts
  const tSame = next.theme === prev.theme

  // Root row (always "new" on any state change, since root is new unless nothing changed at all).
  rootPreviewEl.textContent = truncate(JSON.stringify(next), 60)
  rootRefidEl.textContent = `id: ${refId(next)}`
  rootTagEl.className = 'tree-row__tag ' + (rootSame ? 'tag--same' : 'tag--new')
  rootTagEl.textContent = rootSame ? 'same' : 'new'

  // user row
  userPreviewEl.textContent = truncate(JSON.stringify(next.user), 60)
  userRefidEl.textContent = `id: ${refId(next.user)}`
  markRow({ row: userRowEl, tag: userTagEl }, uSame)

  // posts row
  postsPreviewEl.textContent = truncate(
    `items[${next.posts.items.length}] = ${next.posts.items.map((x) => x.title).join(', ')}`,
    72,
  )
  postsRefidEl.textContent = `id: ${refId(next.posts)}`
  markRow({ row: postsRowEl, tag: postsTagEl }, pSame)

  // theme row
  themePreviewEl.textContent = JSON.stringify(next.theme)
  themeRefidEl.textContent = `id: ${refId(next.theme)}`
  markRow({ row: themeRowEl, tag: themeTagEl }, tSame)

  // Stats
  statTotalEl.textContent = String(dispatches)
  statRootEl.textContent = String(rootChanges)
  statUserEl.textContent = String(userSame)
  statPostsEl.textContent = String(postsSame)
  statThemeEl.textContent = String(themeSame)
}
renderTree(prev)

store.subscribe(() => {
  const next = store.getState() as RootState
  dispatches += 1
  if (next !== prev) rootChanges += 1
  if (next.user === prev.user) userSame += 1
  if (next.posts === prev.posts) postsSame += 1
  if (next.theme === prev.theme) themeSame += 1

  renderTree(next)

  // Log to console what slice kept vs changed reference.
  const diffs = [
    ['user', next.user !== prev.user],
    ['posts', next.posts !== prev.posts],
    ['theme', next.theme !== prev.theme],
  ] as const
  const changed = diffs.filter(([, c]) => c).map(([k]) => k)
  if (changed.length === 0) {
    con.success(
      `dispatch #${dispatches}: ни одна ветка не поменяла ссылку → prev === next (вся экономия сработала).`,
    )
  } else {
    con.info(
      `dispatch #${dispatches}: новая ссылка у [${changed.join(', ')}], остальные — same ref.`,
    )
  }

  prev = next
})

// ── Action handlers ───────────────────────────────────────────────

document.querySelector('[data-act="theme"]')!.addEventListener('click', () => {
  const a = themeSlice.actions.toggle()
  store.dispatch(a)
  con.action(a, 'theme/toggle')
})

document.querySelector('[data-act="user"]')!.addEventListener('click', () => {
  const names = ['Alice', 'Bob', 'Charlie', 'Dana', 'Eli']
  const current = store.getState().user.name
  const next = names.find((n) => n !== current) ?? 'Alice'
  const a = userSlice.actions.setName(next)
  store.dispatch(a)
  con.action(a, 'user/setName')
})

document
  .querySelector('[data-act="user-same"]')!
  .addEventListener('click', () => {
    const current = store.getState().user.name
    const a = userSlice.actions.setName(current)
    store.dispatch(a)
    con.action(a, 'user/setName (same payload)')
    con.warn(
      'Immer видит, что s.name = prev.name (примитив) → ссылка state.user сохранится (write equals read).',
    )
  })

document.querySelector('[data-act="add"]')!.addEventListener('click', () => {
  const n = store.getState().posts.items.length + 1
  const a = postsSlice.actions.addPost(`Post #${n}`)
  store.dispatch(a)
  con.action(a, 'posts/addPost')
})

document
  .querySelector('[data-act="edit-first"]')!
  .addEventListener('click', () => {
    const a = postsSlice.actions.editFirstTitle(
      `Edited at ${Date.now() % 10000}`,
    )
    store.dispatch(a)
    con.action(a, 'posts/editFirstTitle')
    con.info('items[0] мутирован через Immer — posts получит новую ссылку.')
  })

document.querySelector('[data-act="bulk"]')!.addEventListener('click', () => {
  const a = postsSlice.actions.replaceAll([
    { id: nanoid(), title: 'Bulk A' },
    { id: nanoid(), title: 'Bulk B' },
    { id: nanoid(), title: 'Bulk C' },
  ])
  store.dispatch(a)
  con.action(a, 'posts/replaceAll')
  con.warn('Полная замена items → posts и все posts.items[*] новые.')
})

document.querySelector('[data-act="noop"]')!.addEventListener('click', () => {
  store.dispatch({ type: 'UNKNOWN/noop' })
  con.info(
    'dispatch({type:"UNKNOWN/noop"}): ни один reducer не сматчился → prev === next на всех уровнях.',
  )
})

// ── Intro logs ────────────────────────────────────────────────────

con.log(
  'Нажимай кнопки и смотри на тэги (same/new) в дереве: только тронутая ветка получит новую ссылку.',
)
con.info(
  'Это и есть "кеш" на уровне slice: Immer гарантирует структурное разделение — никакой ручной оптимизации.',
)
con.success(
  'Правило: НЕ пересоздавай объекты, которые не менял. createSlice+Immer делает это за тебя.',
)
