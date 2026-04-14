import { legacy_createStore as createStore, combineReducers } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'

interface User {
  id: number
  name: string
}

interface Post {
  id: number
  title: string
  authorId: number
}

interface Comment {
  id: number
  text: string
  postId: number
}

interface AppState {
  users: User[]
  posts: Post[]
  comments: Comment[]
}

interface UserAddedAction {
  type: 'users/userAdded'
  payload: string
}

interface PostAddedAction {
  type: 'posts/postAdded'
  payload: string
}

interface CommentAddedAction {
  type: 'comments/commentAdded'
  payload: string
}

type AppAction =
  | UserAddedAction
  | PostAddedAction
  | CommentAddedAction
  | { type: string }

let nextUserId = 2
let nextPostId = 2
let nextCommentId = 2

const initialUsers: User[] = [
  { id: 1, name: 'Алексей' }
]

const initialPosts: Post[] = [
  { id: 1, title: 'Первый пост', authorId: 1 }
]

const initialComments: Comment[] = [
  { id: 1, text: 'Отличный пост!', postId: 1 }
]

function usersReducer(state: User[] = initialUsers, action: AppAction): User[] {
  switch (action.type) {
    case 'users/userAdded': {
      const newUser: User = {
        id: nextUserId++,
        name: (action as UserAddedAction).payload
      }
      return [...state, newUser]
    }
    default:
      return state
  }
}

function postsReducer(state: Post[] = initialPosts, action: AppAction): Post[] {
  switch (action.type) {
    case 'posts/postAdded': {
      const newPost: Post = {
        id: nextPostId++,
        title: (action as PostAddedAction).payload,
        authorId: 1
      }
      return [...state, newPost]
    }
    default:
      return state
  }
}

function commentsReducer(state: Comment[] = initialComments, action: AppAction): Comment[] {
  switch (action.type) {
    case 'comments/commentAdded': {
      const newComment: Comment = {
        id: nextCommentId++,
        text: (action as CommentAddedAction).payload,
        postId: 1
      }
      return [...state, newComment]
    }
    default:
      return state
  }
}

const rootReducer = combineReducers({
  users: usersReducer,
  posts: postsReducer,
  comments: commentsReducer
})

const store = createStore(rootReducer)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

function render(): void {
  const state = store.getState() as AppState
  const stateDisplay = document.getElementById('state-display')!

  stateDisplay.textContent = JSON.stringify(state, null, 2)

  document.getElementById('user-count')!.textContent = String(state.users.length)
  document.getElementById('post-count')!.textContent = String(state.posts.length)
  document.getElementById('comment-count')!.textContent = String(state.comments.length)

  const userList = document.getElementById('user-list')!
  userList.innerHTML = state.users.map((u: User) => `
    <li style="padding: 4px 8px; border-bottom: 1px solid var(--border); color: var(--text-primary);">
      <span style="color: var(--accent-cyan); font-family: var(--font-mono);">#${u.id}</span> ${u.name}
    </li>
  `).join('')

  const postList = document.getElementById('post-list')!
  postList.innerHTML = state.posts.map((p: Post) => `
    <li style="padding: 4px 8px; border-bottom: 1px solid var(--border); color: var(--text-primary);">
      <span style="color: var(--accent-orange); font-family: var(--font-mono);">#${p.id}</span> ${p.title}
    </li>
  `).join('')

  const commentList = document.getElementById('comment-list')!
  commentList.innerHTML = state.comments.map((c: Comment) => `
    <li style="padding: 4px 8px; border-bottom: 1px solid var(--border); color: var(--text-primary);">
      <span style="color: var(--success); font-family: var(--font-mono);">#${c.id}</span> ${c.text}
    </li>
  `).join('')
}

store.subscribe(render)
render()

document.getElementById('btn-add-user')!.addEventListener('click', (): void => {
  const input = document.getElementById('user-input') as HTMLInputElement
  const name = input.value.trim()
  if (!name) return
  store.dispatch({ type: 'users/userAdded', payload: name })
  input.value = ''
  input.focus()
})

document.getElementById('user-input')!.addEventListener('keydown', (e: KeyboardEvent): void => {
  if (e.key === 'Enter') document.getElementById('btn-add-user')!.click()
})

document.getElementById('btn-add-post')!.addEventListener('click', (): void => {
  const input = document.getElementById('post-input') as HTMLInputElement
  const title = input.value.trim()
  if (!title) return
  store.dispatch({ type: 'posts/postAdded', payload: title })
  input.value = ''
  input.focus()
})

document.getElementById('post-input')!.addEventListener('keydown', (e: KeyboardEvent): void => {
  if (e.key === 'Enter') document.getElementById('btn-add-post')!.click()
})

document.getElementById('btn-add-comment')!.addEventListener('click', (): void => {
  const input = document.getElementById('comment-input') as HTMLInputElement
  const text = input.value.trim()
  if (!text) return
  store.dispatch({ type: 'comments/commentAdded', payload: text })
  input.value = ''
  input.focus()
})

document.getElementById('comment-input')!.addEventListener('keydown', (e: KeyboardEvent): void => {
  if (e.key === 'Enter') document.getElementById('btn-add-comment')!.click()
})
