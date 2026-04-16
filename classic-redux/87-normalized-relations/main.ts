import { legacy_createStore as createStore, combineReducers } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'
import { ConsolePanel } from '../shared/console-panel'

interface Post {
  id: number
  title: string
  body: string
}

interface Comment {
  id: number
  postId: number
  text: string
  author: string
}

interface NormalizedSlice<T> {
  ids: number[]
  entities: Record<number, T>
  nextId: number
}

interface AddCommentAction {
  type: 'comments/add'
  payload: { postId: number; text: string; author: string }
}

interface RemoveCommentAction {
  type: 'comments/remove'
  payload: number
}

type PostAction = { type: string }
type CommentAction = AddCommentAction | RemoveCommentAction | { type: string }

const initialPosts: NormalizedSlice<Post> = {
  ids: [1, 2, 3],
  entities: {
    1: { id: 1, title: 'Введение в Redux', body: 'Redux — предсказуемый контейнер состояния...' },
    2: { id: 2, title: 'Нормализация данных', body: 'Нормализация — это хранение данных в плоской структуре...' },
    3: { id: 3, title: 'Селекторы и связи', body: 'Селекторы позволяют «соединять» данные из разных слайсов...' }
  },
  nextId: 4
}

const initialComments: NormalizedSlice<Comment> = {
  ids: [1, 2, 3, 4],
  entities: {
    1: { id: 1, postId: 1, text: 'Отличная статья!', author: 'Анна' },
    2: { id: 2, postId: 1, text: 'Спасибо, очень полезно', author: 'Борис' },
    3: { id: 3, postId: 2, text: 'Нормализация — это мощно', author: 'Вера' },
    4: { id: 4, postId: 3, text: 'Ждём продолжения!', author: 'Григорий' }
  },
  nextId: 5
}

function postsReducer(state: NormalizedSlice<Post> = initialPosts, action: PostAction): NormalizedSlice<Post> {
  switch (action.type) {
    default:
      return state
  }
}

function commentsReducer(state: NormalizedSlice<Comment> = initialComments, action: CommentAction): NormalizedSlice<Comment> {
  switch (action.type) {
    case 'comments/add': {
      const { postId, text, author } = (action as AddCommentAction).payload
      const id = state.nextId
      return {
        ...state,
        ids: [...state.ids, id],
        entities: {
          ...state.entities,
          [id]: { id, postId, text, author }
        },
        nextId: id + 1
      }
    }
    case 'comments/remove': {
      const id = (action as RemoveCommentAction).payload
      const { [id]: _, ...rest } = state.entities
      void _
      return {
        ...state,
        ids: state.ids.filter(i => i !== id),
        entities: rest
      }
    }
    default:
      return state
  }
}

const rootReducer = combineReducers({
  posts: postsReducer,
  comments: commentsReducer
})

type RootState = ReturnType<typeof rootReducer>

const selectAllPosts = (state: RootState): Post[] =>
  state.posts.ids.map(id => state.posts.entities[id])

const selectPostById = (state: RootState, id: number): Post | undefined =>
  state.posts.entities[id]

const selectAllComments = (state: RootState): Comment[] =>
  state.comments.ids.map(id => state.comments.entities[id])

const selectCommentsByPostId = (state: RootState, postId: number): Comment[] =>
  selectAllComments(state).filter(c => c.postId === postId)

const store = createStore(rootReducer)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

const postsList = document.getElementById('posts-list')!
const commentsList = document.getElementById('comments-list')!
const selectedPostTitle = document.getElementById('selected-post-title')!
const addCommentForm = document.getElementById('add-comment-form')!
const inputComment = document.getElementById('input-comment') as HTMLInputElement
const btnAddComment = document.getElementById('btn-add-comment')!
const stateDisplay = document.getElementById('state-display')!

let selectedPostId: number | null = null

function render(): void {
  const state = store.getState()
  const posts = selectAllPosts(state)

  postsList.innerHTML = posts.map(post => `
    <div class="btn ${selectedPostId === post.id ? 'btn--accent' : ''}"
         data-post="${post.id}"
         style="display: block; text-align: left; margin-bottom: 6px; cursor: pointer;">
      <div style="font-weight: 600; color: var(--text-bright); font-size: 0.9rem;">${post.title}</div>
      <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
        ${selectCommentsByPostId(state, post.id).length} комментариев
      </div>
    </div>
  `).join('')

  postsList.querySelectorAll('[data-post]').forEach(el => {
    el.addEventListener('click', (): void => {
      const postId = parseInt((el as HTMLElement).dataset.post!, 10)
      selectedPostId = postId
      const post = selectPostById(state, postId)
      consolePanel.log(`── Выбран пост #${postId}: "${post?.title}" ──`)
      consolePanel.info(`selectCommentsByPostId(state, ${postId})`)
      const comments = selectCommentsByPostId(state, postId)
      consolePanel.success(`Найдено ${comments.length} комментариев`)
      comments.forEach(c => {
        consolePanel.log(`  comment #${c.id}: postId=${c.postId}, "${c.text}" — ${c.author}`)
      })
      render()
    })
  })

  if (selectedPostId !== null) {
    const post = selectPostById(state, selectedPostId)
    selectedPostTitle.textContent = post ? `#${post.id} "${post.title}"` : ''
    const comments = selectCommentsByPostId(state, selectedPostId)

    commentsList.innerHTML = comments.length > 0
      ? comments.map(c => `
        <div style="padding: 8px 12px; border-bottom: 1px solid var(--border); display: flex; align-items: flex-start; gap: 10px;">
          <span style="color: var(--accent-purple); font-weight: 600; font-size: 0.82rem; flex-shrink: 0;">${c.author}:</span>
          <span style="color: var(--text-bright); font-size: 0.85rem; flex: 1;">${c.text}</span>
          <button class="btn btn--sm btn--danger" data-remove-comment="${c.id}" style="flex-shrink: 0;">✕</button>
        </div>
      `).join('')
      : '<div style="color: var(--text-muted); padding: 16px; text-align: center;">Нет комментариев</div>'

    commentsList.querySelectorAll('[data-remove-comment]').forEach(btn => {
      btn.addEventListener('click', (): void => {
        const id = parseInt((btn as HTMLElement).dataset.removeComment!, 10)
        store.dispatch({ type: 'comments/remove', payload: id })
        consolePanel.log(`Удалён комментарий #${id}`)
      })
    })

    addCommentForm.style.display = 'block'
  } else {
    selectedPostTitle.textContent = ''
    commentsList.innerHTML = '<div style="color: var(--text-muted); padding: 16px; text-align: center;">Выберите пост ←</div>'
    addCommentForm.style.display = 'none'
  }

  stateDisplay.textContent = JSON.stringify(state, null, 2)
}

store.subscribe(render)
render()

consolePanel.info('Связи между сущностями: posts ↔ comments')
consolePanel.log('comment.postId → ссылка на post.id')
consolePanel.log('selectCommentsByPostId(state, postId) — «join» в селекторе')
consolePanel.log('')
consolePanel.log('Выберите пост слева, чтобы увидеть связанные комментарии')

btnAddComment.addEventListener('click', (): void => {
  const text = inputComment.value.trim()
  if (!text || selectedPostId === null) return
  store.dispatch({
    type: 'comments/add',
    payload: { postId: selectedPostId, text, author: 'Вы' }
  })
  consolePanel.success(`Добавлен комментарий к посту #${selectedPostId}: "${text}"`)
  consolePanel.log(`comment.postId = ${selectedPostId} → ссылка на post.id`)
  inputComment.value = ''
})

inputComment.addEventListener('keydown', (e: KeyboardEvent): void => {
  if (e.key === 'Enter') btnAddComment.click()
})
