import { legacy_createStore as createStore, applyMiddleware } from 'redux'
import { thunk } from 'redux-thunk'
import { DevToolsPanel } from '../shared/devtools-panel'
import { ConsolePanel } from '../shared/console-panel'

interface User {
  id: number
  name: string
}

interface Post {
  id: number
  userId: number
  title: string
}

interface AppState {
  phase: 'idle' | 'loading-users' | 'loading-posts' | 'done'
  users: User[]
  posts: Post[]
  progress: number
  progressTotal: number
  progressMessage: string
}

interface UsersLoadingAction { type: 'users/loading' }
interface UsersLoadedAction { type: 'users/loaded'; payload: User[] }
interface PostsProgressAction { type: 'posts/progress'; payload: { current: number; total: number; message: string } }
interface PostsLoadedAction { type: 'posts/loaded'; payload: Post[] }
interface AllDoneAction { type: 'all/done' }
interface ResetAction { type: 'reset' }

type AppAction =
  | UsersLoadingAction | UsersLoadedAction
  | PostsProgressAction | PostsLoadedAction
  | AllDoneAction | ResetAction
  | { type: string }

const initialState: AppState = {
  phase: 'idle',
  users: [],
  posts: [],
  progress: 0,
  progressTotal: 0,
  progressMessage: 'Ожидание запуска...'
}

function appReducer(state: AppState = initialState, action: AppAction): AppState {
  switch (action.type) {
    case 'users/loading':
      return { ...state, phase: 'loading-users', progressMessage: 'Загрузка пользователей...' }
    case 'users/loaded':
      return {
        ...state,
        users: (action as UsersLoadedAction).payload,
        phase: 'loading-posts',
        progressMessage: 'Пользователи загружены. Загрузка постов...'
      }
    case 'posts/progress': {
      const p = (action as PostsProgressAction).payload
      return {
        ...state,
        progress: p.current,
        progressTotal: p.total,
        progressMessage: p.message
      }
    }
    case 'posts/loaded':
      return { ...state, posts: [...state.posts, ...(action as PostsLoadedAction).payload] }
    case 'all/done':
      return { ...state, phase: 'done', progressMessage: 'Всё загружено!' }
    case 'reset':
      return initialState
    default:
      return state
  }
}

const store = createStore(appReducer, applyMiddleware(thunk))

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

const btnLoadAll = document.getElementById('btn-load-all')!
const btnReset = document.getElementById('btn-reset')!
const progressFill = document.getElementById('progress-fill')!
const progressText = document.getElementById('progress-text')!
const usersDisplay = document.getElementById('users-display')!
const postsDisplay = document.getElementById('posts-display')!
const stateDisplay = document.getElementById('state-display')!

const fakeUsers: User[] = [
  { id: 1, name: 'Алексей' },
  { id: 2, name: 'Мария' },
  { id: 3, name: 'Дмитрий' }
]

const fakePosts: Record<number, Post[]> = {
  1: [
    { id: 101, userId: 1, title: 'Первый пост Алексея' },
    { id: 102, userId: 1, title: 'Второй пост Алексея' }
  ],
  2: [
    { id: 201, userId: 2, title: 'Пост Марии о Redux' }
  ],
  3: [
    { id: 301, userId: 3, title: 'Заметки Дмитрия' },
    { id: 302, userId: 3, title: 'Дмитрий про thunks' }
  ]
}

function fetchUsersApi(): Promise<User[]> {
  return new Promise<User[]>((resolve) => {
    setTimeout(() => resolve(fakeUsers), 1000)
  })
}

function fetchPostsApi(userId: number): Promise<Post[]> {
  return new Promise<Post[]>((resolve) => {
    setTimeout(() => resolve(fakePosts[userId] || []), 500)
  })
}

const loadAll = () => {
  return async (dispatch: any): Promise<void> => {
    consolePanel.log('thunk: начинаем последовательную загрузку', 'color: #569cd6')

    dispatch({ type: 'users/loading' })
    consolePanel.log('thunk: dispatch({ type: "users/loading" })', 'color: #c586c0')
    consolePanel.log('thunk: ⏳ загрузка пользователей (1 сек)...', 'color: #dcdcaa')

    const users = await fetchUsersApi()

    dispatch({ type: 'users/loaded', payload: users })
    consolePanel.success('thunk: dispatch({ type: "users/loaded" }) — ' + users.length + ' пользователей')

    const total = users.length
    for (let i = 0; i < users.length; i++) {
      const user = users[i]
      const current = i + 1

      dispatch({
        type: 'posts/progress',
        payload: { current, total, message: `Загрузка постов для ${user.name} (${current}/${total})...` }
      })
      consolePanel.log(`thunk: ⏳ загрузка постов для ${user.name} (${current}/${total})...`, 'color: #dcdcaa')

      const posts = await fetchPostsApi(user.id)

      dispatch({ type: 'posts/loaded', payload: posts })
      consolePanel.success(`thunk: dispatch posts для ${user.name} — ${posts.length} постов`)
    }

    dispatch({ type: 'all/done' })
    consolePanel.success('thunk: dispatch({ type: "all/done" }) — всё загружено!')
    consolePanel.log('')
  }
}

function render(): void {
  const state = store.getState() as AppState

  const pct = state.progressTotal > 0
    ? Math.round((state.progress / state.progressTotal) * 100)
    : state.phase === 'done' ? 100 : state.phase === 'loading-users' ? 10 : 0
  progressFill.style.width = pct + '%'
  progressFill.style.background = state.phase === 'done' ? 'var(--accent-green)' : 'var(--accent-orange)'
  progressText.textContent = state.progressMessage

  if (state.users.length > 0) {
    usersDisplay.innerHTML = state.users.map((u: User) => `
      <div style="display: flex; gap: 12px; padding: 4px 8px; border-bottom: 1px solid var(--border); font-size: 0.85rem;">
        <span style="color: var(--accent); font-family: var(--font-mono);">#${u.id}</span>
        <span style="color: var(--text-bright);">${u.name}</span>
      </div>
    `).join('')
  } else {
    usersDisplay.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">—</span>'
  }

  if (state.posts.length > 0) {
    postsDisplay.innerHTML = state.posts.map((p: Post) => `
      <div style="display: flex; gap: 12px; padding: 4px 8px; border-bottom: 1px solid var(--border); font-size: 0.85rem;">
        <span style="color: var(--accent-cyan); font-family: var(--font-mono);">user#${p.userId}</span>
        <span style="color: var(--text-bright); flex: 1;">${p.title}</span>
      </div>
    `).join('')
  } else {
    postsDisplay.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">—</span>'
  }

  stateDisplay.textContent = JSON.stringify(state, null, 2)

  const isLoading = state.phase === 'loading-users' || state.phase === 'loading-posts'
  btnLoadAll.textContent = isLoading ? '⏳ Загрузка...' : '📦 Load All'
  ;(btnLoadAll as HTMLButtonElement).disabled = isLoading
}

store.subscribe(render)
render()

consolePanel.info('Последовательные dispatch: users → posts для каждого user')

btnLoadAll.addEventListener('click', (): void => {
  consolePanel.log('──── dispatch(loadAll()) ────')
  store.dispatch(loadAll() as any)
})

btnReset.addEventListener('click', (): void => {
  store.dispatch({ type: 'reset' })
  consolePanel.log('──── dispatch({ type: "reset" }) ────')
  consolePanel.success('State сброшен')
  consolePanel.log('')
})
