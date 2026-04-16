import { legacy_createStore as createStore, combineReducers } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'

interface User {
  id: number
  name: string
}

interface Post {
  id: number
  authorId: number
  title: string
}

interface Comment {
  id: number
  postId: number
  authorId: number
  text: string
}

interface NormalizedSlice<T> {
  ids: number[]
  entities: Record<number, T>
  nextId: number
}

interface AddUserAction { type: 'users/add'; payload: string }
interface RemoveUserAction { type: 'users/remove'; payload: number }
interface AddPostAction { type: 'posts/add'; payload: { authorId: number; title: string } }
interface RemovePostAction { type: 'posts/remove'; payload: number }
interface AddCommentAction { type: 'comments/add'; payload: { postId: number; authorId: number; text: string } }
interface RemoveCommentAction { type: 'comments/remove'; payload: number }

type UserAction = AddUserAction | RemoveUserAction | { type: string }
type PostAction = AddPostAction | RemovePostAction | { type: string }
type CommentAction = AddCommentAction | RemoveCommentAction | { type: string }

const initialUsers: NormalizedSlice<User> = {
  ids: [1, 2],
  entities: {
    1: { id: 1, name: 'Алексей' },
    2: { id: 2, name: 'Мария' }
  },
  nextId: 3
}

const initialPosts: NormalizedSlice<Post> = {
  ids: [1, 2, 3],
  entities: {
    1: { id: 1, authorId: 1, title: 'Введение в Redux' },
    2: { id: 2, authorId: 1, title: 'Нормализация данных' },
    3: { id: 3, authorId: 2, title: 'Селекторы и связи' }
  },
  nextId: 4
}

const initialComments: NormalizedSlice<Comment> = {
  ids: [1, 2, 3],
  entities: {
    1: { id: 1, postId: 1, authorId: 2, text: 'Отличная статья!' },
    2: { id: 2, postId: 1, authorId: 1, text: 'Спасибо за отзыв' },
    3: { id: 3, postId: 3, authorId: 1, text: 'Интересный подход' }
  },
  nextId: 4
}

function usersReducer(state: NormalizedSlice<User> = initialUsers, action: UserAction): NormalizedSlice<User> {
  switch (action.type) {
    case 'users/add': {
      const id = state.nextId
      const name = (action as AddUserAction).payload
      return {
        ...state,
        ids: [...state.ids, id],
        entities: { ...state.entities, [id]: { id, name } },
        nextId: id + 1
      }
    }
    case 'users/remove': {
      const id = (action as RemoveUserAction).payload
      const { [id]: _, ...rest } = state.entities
      void _
      return { ...state, ids: state.ids.filter(i => i !== id), entities: rest }
    }
    default:
      return state
  }
}

function postsReducer(state: NormalizedSlice<Post> = initialPosts, action: PostAction): NormalizedSlice<Post> {
  switch (action.type) {
    case 'posts/add': {
      const id = state.nextId
      const { authorId, title } = (action as AddPostAction).payload
      return {
        ...state,
        ids: [...state.ids, id],
        entities: { ...state.entities, [id]: { id, authorId, title } },
        nextId: id + 1
      }
    }
    case 'posts/remove': {
      const id = (action as RemovePostAction).payload
      const { [id]: _, ...rest } = state.entities
      void _
      return { ...state, ids: state.ids.filter(i => i !== id), entities: rest }
    }
    default:
      return state
  }
}

function commentsReducer(state: NormalizedSlice<Comment> = initialComments, action: CommentAction): NormalizedSlice<Comment> {
  switch (action.type) {
    case 'comments/add': {
      const id = state.nextId
      const { postId, authorId, text } = (action as AddCommentAction).payload
      return {
        ...state,
        ids: [...state.ids, id],
        entities: { ...state.entities, [id]: { id, postId, authorId, text } },
        nextId: id + 1
      }
    }
    case 'comments/remove': {
      const id = (action as RemoveCommentAction).payload
      const { [id]: _, ...rest } = state.entities
      void _
      return { ...state, ids: state.ids.filter(i => i !== id), entities: rest }
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

type RootState = ReturnType<typeof rootReducer>

const selectAllUsers = (state: RootState): User[] =>
  state.users.ids.map(id => state.users.entities[id])

const selectUserById = (state: RootState, id: number): User | undefined =>
  state.users.entities[id]

const selectAllPosts = (state: RootState): Post[] =>
  state.posts.ids.map(id => state.posts.entities[id])

const selectPostsByUserId = (state: RootState, userId: number): Post[] =>
  selectAllPosts(state).filter(p => p.authorId === userId)

const selectAllComments = (state: RootState): Comment[] =>
  state.comments.ids.map(id => state.comments.entities[id])

const selectCommentsByPostId = (state: RootState, postId: number): Comment[] =>
  selectAllComments(state).filter(c => c.postId === postId)

const store = createStore(rootReducer)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const usersList = document.getElementById('users-list')!
const postsList = document.getElementById('posts-list')!
const commentsList = document.getElementById('comments-list')!
const postsAuthor = document.getElementById('posts-author')!
const commentsPost = document.getElementById('comments-post')!
const commentForm = document.getElementById('comment-form')!
const inputComment = document.getElementById('input-comment') as HTMLInputElement
const btnAddComment = document.getElementById('btn-add-comment')!
const inputUser = document.getElementById('input-user') as HTMLInputElement
const btnAddUser = document.getElementById('btn-add-user')!
const selectAuthor = document.getElementById('select-author') as HTMLSelectElement
const inputPost = document.getElementById('input-post') as HTMLInputElement
const btnAddPost = document.getElementById('btn-add-post')!
const stateDisplay = document.getElementById('state-display')!

let selectedUserId: number | null = null
let selectedPostId: number | null = null

function render(): void {
  const state = store.getState()

  const users = selectAllUsers(state)
  usersList.innerHTML = users.map(u => `
    <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 4px;">
      <button class="btn btn--sm ${selectedUserId === u.id ? 'btn--accent' : ''}" data-user="${u.id}" style="flex: 1; text-align: left;">
        👤 ${u.name}
      </button>
      <button class="btn btn--sm btn--danger" data-remove-user="${u.id}" style="padding: 4px 6px;">✕</button>
    </div>
  `).join('')

  selectAuthor.innerHTML = '<option value="">— Автор —</option>' +
    users.map(u => `<option value="${u.id}">${u.name}</option>`).join('')

  if (selectedUserId !== null) {
    const user = selectUserById(state, selectedUserId)
    postsAuthor.textContent = user ? user.name : ''
    const posts = selectPostsByUserId(state, selectedUserId)
    postsList.innerHTML = posts.length > 0
      ? posts.map(p => `
        <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 4px;">
          <button class="btn btn--sm ${selectedPostId === p.id ? 'btn--accent' : ''}" data-post="${p.id}" style="flex: 1; text-align: left; font-size: 0.8rem;">
            📝 ${p.title}
          </button>
          <button class="btn btn--sm btn--danger" data-remove-post="${p.id}" style="padding: 4px 6px;">✕</button>
        </div>
      `).join('')
      : '<div style="color: var(--text-muted); padding: 12px; font-size: 0.82rem;">Нет постов</div>'
  } else {
    postsAuthor.textContent = ''
    postsList.innerHTML = '<div style="color: var(--text-muted); padding: 12px; font-size: 0.82rem;">← Выберите автора</div>'
  }

  if (selectedPostId !== null) {
    const post = state.posts.entities[selectedPostId]
    commentsPost.textContent = post ? `к "${post.title}"` : ''
    const comments = selectCommentsByPostId(state, selectedPostId)
    commentsList.innerHTML = comments.length > 0
      ? comments.map(c => {
        const author = selectUserById(state, c.authorId)
        return `
          <div style="padding: 6px 8px; border-bottom: 1px solid var(--border); display: flex; gap: 8px; align-items: flex-start; font-size: 0.82rem;">
            <span style="color: var(--accent-purple); font-weight: 600; flex-shrink: 0;">${author?.name ?? '?'}:</span>
            <span style="color: var(--text-bright); flex: 1;">${c.text}</span>
            <button class="btn btn--sm btn--danger" data-remove-comment="${c.id}" style="padding: 2px 5px; font-size: 0.7rem;">✕</button>
          </div>
        `
      }).join('')
      : '<div style="color: var(--text-muted); padding: 12px; font-size: 0.82rem;">Нет комментариев</div>'
    commentForm.style.display = 'block'
  } else {
    commentsPost.textContent = ''
    commentsList.innerHTML = '<div style="color: var(--text-muted); padding: 12px; font-size: 0.82rem;">← Выберите пост</div>'
    commentForm.style.display = 'none'
  }

  stateDisplay.textContent = JSON.stringify(state, null, 2)

  bindEvents()
}

function bindEvents(): void {
  document.querySelectorAll('[data-user]').forEach(el => {
    el.addEventListener('click', (): void => {
      selectedUserId = parseInt((el as HTMLElement).dataset.user!, 10)
      selectedPostId = null
      render()
    })
  })

  document.querySelectorAll('[data-post]').forEach(el => {
    el.addEventListener('click', (): void => {
      selectedPostId = parseInt((el as HTMLElement).dataset.post!, 10)
      render()
    })
  })

  document.querySelectorAll('[data-remove-user]').forEach(el => {
    el.addEventListener('click', (): void => {
      const id = parseInt((el as HTMLElement).dataset.removeUser!, 10)
      store.dispatch({ type: 'users/remove', payload: id })
      if (selectedUserId === id) { selectedUserId = null; selectedPostId = null }
    })
  })

  document.querySelectorAll('[data-remove-post]').forEach(el => {
    el.addEventListener('click', (): void => {
      const id = parseInt((el as HTMLElement).dataset.removePost!, 10)
      store.dispatch({ type: 'posts/remove', payload: id })
      if (selectedPostId === id) selectedPostId = null
    })
  })

  document.querySelectorAll('[data-remove-comment]').forEach(el => {
    el.addEventListener('click', (): void => {
      const id = parseInt((el as HTMLElement).dataset.removeComment!, 10)
      store.dispatch({ type: 'comments/remove', payload: id })
    })
  })
}

store.subscribe(render)
render()

btnAddUser.addEventListener('click', (): void => {
  const name = inputUser.value.trim()
  if (!name) return
  store.dispatch({ type: 'users/add', payload: name })
  inputUser.value = ''
})

inputUser.addEventListener('keydown', (e: KeyboardEvent): void => {
  if (e.key === 'Enter') btnAddUser.click()
})

btnAddPost.addEventListener('click', (): void => {
  const title = inputPost.value.trim()
  const authorId = parseInt(selectAuthor.value, 10)
  if (!title || isNaN(authorId)) return
  store.dispatch({ type: 'posts/add', payload: { authorId, title } })
  inputPost.value = ''
})

inputPost.addEventListener('keydown', (e: KeyboardEvent): void => {
  if (e.key === 'Enter') btnAddPost.click()
})

btnAddComment.addEventListener('click', (): void => {
  const text = inputComment.value.trim()
  if (!text || selectedPostId === null || selectedUserId === null) return
  store.dispatch({
    type: 'comments/add',
    payload: { postId: selectedPostId, authorId: selectedUserId, text }
  })
  inputComment.value = ''
})

inputComment.addEventListener('keydown', (e: KeyboardEvent): void => {
  if (e.key === 'Enter') btnAddComment.click()
})
