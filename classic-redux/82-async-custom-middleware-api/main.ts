import { legacy_createStore as createStore, applyMiddleware, combineReducers } from 'redux'
import { thunk } from 'redux-thunk'
import { DevToolsPanel } from '../shared/devtools-panel'
import { ConsolePanel } from '../shared/console-panel'

interface User {
  id: number
  name: string
  email: string
}

interface Post {
  id: number
  title: string
  userId: number
}

interface ResourceState<T> {
  status: 'idle' | 'loading' | 'loaded' | 'error'
  data: T[]
  error: string | null
}

interface ApiMeta {
  api: {
    url: string
    method: string
  }
}

interface ApiAction {
  type: string
  meta: ApiMeta
}

interface SuccessAction {
  type: string
  payload: any
}

interface FailureAction {
  type: string
  error: string
}

interface RootState {
  users: ResourceState<User>
  posts: ResourceState<Post>
}

const fakeUsers: User[] = [
  { id: 1, name: 'Иван Петров', email: 'ivan@example.com' },
  { id: 2, name: 'Мария Сидорова', email: 'maria@example.com' },
  { id: 3, name: 'Алексей Козлов', email: 'alex@example.com' }
]

const fakePosts: Post[] = [
  { id: 1, title: 'Введение в Redux', userId: 1 },
  { id: 2, title: 'Middleware паттерны', userId: 2 },
  { id: 3, title: 'Нормализация данных', userId: 1 },
  { id: 4, title: 'Redux и TypeScript', userId: 3 }
]

const fakeDatabase: Record<string, any[]> = {
  '/api/users': fakeUsers,
  '/api/posts': fakePosts
}

const apiMiddleware = (store: any) => (next: any) => (action: any): void => {
  if (!action.meta?.api) {
    return next(action)
  }

  const { url, method } = action.meta.api

  consolePanel.log(`🔄 API Middleware перехватил: ${action.type}`, 'color: #c586c0')
  consolePanel.log(`   → ${method} ${url}`, 'color: #9cdcfe')

  next({ type: `${action.type}/pending` })

  setTimeout(() => {
    const data = fakeDatabase[url]

    if (data) {
      consolePanel.log(`✅ ${action.type}/success — получено ${data.length} записей`, 'color: #4caf50')
      store.dispatch({
        type: `${action.type}/success`,
        payload: data
      })
    } else {
      consolePanel.log(`❌ ${action.type}/failure — URL не найден`, 'color: #f44747')
      store.dispatch({
        type: `${action.type}/failure`,
        error: `URL ${url} не найден`
      })
    }
  }, 800)
}

function createResourceReducer<T>(prefix: string) {
  const initialState: ResourceState<T> = {
    status: 'idle',
    data: [],
    error: null
  }

  return function reducer(state: ResourceState<T> = initialState, action: any): ResourceState<T> {
    switch (action.type) {
      case `${prefix}/pending`:
        return { ...state, status: 'loading', error: null }
      case `${prefix}/success`:
        return { ...state, status: 'loaded', data: action.payload, error: null }
      case `${prefix}/failure`:
        return { ...state, status: 'error', data: [], error: action.error }
      default:
        return state
    }
  }
}

const rootReducer = combineReducers({
  users: createResourceReducer<User>('users/fetch'),
  posts: createResourceReducer<Post>('posts/fetch')
})

const store = createStore(
  rootReducer,
  applyMiddleware(apiMiddleware as any, thunk as any)
)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

const btnUsers = document.getElementById('btn-users')!
const btnPosts = document.getElementById('btn-posts')!
const usersDisplay = document.getElementById('users-display')!
const postsDisplay = document.getElementById('posts-display')!
const stateDisplay = document.getElementById('state-display')!

function renderResource<T>(
  container: HTMLElement,
  resource: ResourceState<T>,
  renderItem: (item: T) => string,
  emptyText: string
): void {
  if (resource.status === 'idle') {
    container.innerHTML = `<span style="color: var(--text-muted); font-size: 0.85rem;">${emptyText}</span>`
  } else if (resource.status === 'loading') {
    container.innerHTML = `<span style="color: var(--accent-orange); font-size: 0.85rem;">⏳ Загрузка...</span>`
  } else if (resource.status === 'error') {
    container.innerHTML = `<span style="color: var(--accent-red); font-size: 0.85rem;">❌ ${resource.error}</span>`
  } else {
    container.innerHTML = resource.data.map(renderItem).join('')
  }
}

function render(): void {
  const state = store.getState() as RootState

  renderResource<User>(usersDisplay, state.users, (user: User) => `
    <div style="display: flex; gap: 12px; padding: 6px 10px; border-bottom: 1px solid var(--border); font-size: 0.85rem;">
      <span style="color: var(--accent-cyan);">#${user.id}</span>
      <span style="color: var(--text-bright); flex: 1;">${user.name}</span>
      <span style="color: var(--text-muted);">${user.email}</span>
    </div>
  `, 'Нажмите "Load users" ↑')

  renderResource<Post>(postsDisplay, state.posts, (post: Post) => `
    <div style="display: flex; gap: 12px; padding: 6px 10px; border-bottom: 1px solid var(--border); font-size: 0.85rem;">
      <span style="color: var(--accent-cyan);">#${post.id}</span>
      <span style="color: var(--text-bright); flex: 1;">${post.title}</span>
      <span style="color: var(--text-muted);">user: ${post.userId}</span>
    </div>
  `, 'Нажмите "Load posts" ↑')

  stateDisplay.textContent = JSON.stringify(state, null, 2)

  const usersBtn = btnUsers as HTMLButtonElement
  const postsBtn = btnPosts as HTMLButtonElement
  usersBtn.disabled = state.users.status === 'loading'
  postsBtn.disabled = state.posts.status === 'loading'
  usersBtn.textContent = state.users.status === 'loading' ? '⏳ Загрузка...' : '👥 Load users'
  postsBtn.textContent = state.posts.status === 'loading' ? '⏳ Загрузка...' : '📝 Load posts'
}

store.subscribe(render)
render()

consolePanel.info('Custom API Middleware')
consolePanel.info('Middleware перехватывает actions с meta.api и имитирует HTTP-запрос')
consolePanel.log('')

btnUsers.addEventListener('click', (): void => {
  consolePanel.log('──── dispatch users/fetch ────', 'color: #dcdcaa')
  store.dispatch({
    type: 'users/fetch',
    meta: { api: { url: '/api/users', method: 'GET' } }
  } as any)
})

btnPosts.addEventListener('click', (): void => {
  consolePanel.log('──── dispatch posts/fetch ────', 'color: #dcdcaa')
  store.dispatch({
    type: 'posts/fetch',
    meta: { api: { url: '/api/posts', method: 'GET' } }
  } as any)
})
