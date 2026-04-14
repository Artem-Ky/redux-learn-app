import { legacy_createStore as createStore } from 'redux'
import { ConsolePanel } from '../shared/console-panel'

interface NestedAuthor {
  id: number
  name: string
}

interface NestedComment {
  id: number
  text: string
  author: string
}

interface NestedPost {
  id: number
  title: string
  author: NestedAuthor
  comments: NestedComment[]
}

interface NestedState {
  posts: NestedPost[]
}

interface FlatUser {
  id: number
  name: string
}

interface FlatPost {
  id: number
  title: string
  authorId: number
}

interface FlatComment {
  id: number
  text: string
  postId: number
  authorName: string
}

interface FlatState {
  posts: FlatPost[]
  users: FlatUser[]
  comments: FlatComment[]
}

interface ViewAction {
  type: 'view/switched'
  payload: 'nested' | 'flat'
}

interface AppState {
  currentView: 'nested' | 'flat'
}

type AppAction = ViewAction | { type: string }

const nestedData: NestedState = {
  posts: [
    {
      id: 1,
      title: 'Введение в Redux',
      author: { id: 1, name: 'Алексей' },
      comments: [
        { id: 1, text: 'Отличная статья!', author: 'Мария' },
        { id: 2, text: 'Очень полезно', author: 'Иван' }
      ]
    },
    {
      id: 2,
      title: 'Reducer Patterns',
      author: { id: 1, name: 'Алексей' },
      comments: [
        { id: 3, text: 'Спасибо за примеры', author: 'Мария' }
      ]
    },
    {
      id: 3,
      title: 'State Management',
      author: { id: 2, name: 'Мария' },
      comments: []
    }
  ]
}

const flatData: FlatState = {
  posts: [
    { id: 1, title: 'Введение в Redux', authorId: 1 },
    { id: 2, title: 'Reducer Patterns', authorId: 1 },
    { id: 3, title: 'State Management', authorId: 2 }
  ],
  users: [
    { id: 1, name: 'Алексей' },
    { id: 2, name: 'Мария' },
    { id: 3, name: 'Иван' }
  ],
  comments: [
    { id: 1, text: 'Отличная статья!', postId: 1, authorName: 'Мария' },
    { id: 2, text: 'Очень полезно', postId: 1, authorName: 'Иван' },
    { id: 3, text: 'Спасибо за примеры', postId: 2, authorName: 'Мария' }
  ]
}

const initialState: AppState = {
  currentView: 'nested'
}

function viewReducer(state: AppState = initialState, action: AppAction): AppState {
  switch (action.type) {
    case 'view/switched':
      return { ...state, currentView: (action as ViewAction).payload }
    default:
      return state
  }
}

const store = createStore(viewReducer)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

function showNestedAnalysis(): void {
  consolePanel.clear()
  consolePanel.info('📊 Анализ: Вложенная (Nested) структура')
  consolePanel.log('Структура: posts → [{ author: {...}, comments: [...] }]')
  consolePanel.warn('⚠ Дублирование: «Алексей» записан в каждом посте отдельно')
  consolePanel.warn('⚠ Обновление автора: нужно пройти по ВСЕМ постам')
  consolePanel.warn('⚠ Глубокие spread: { ...state, posts: state.posts.map(p => ({ ...p, author: {...} })) }')
  consolePanel.success('✓ Плюс: данные сгруппированы, удобно для чтения')
  consolePanel.success('✓ Плюс: один запрос — все данные поста')
}

function showFlatAnalysis(): void {
  consolePanel.clear()
  consolePanel.info('📊 Анализ: Плоская (Normalized) структура')
  consolePanel.log('Структура: { posts: [...], users: [...], comments: [...] }')
  consolePanel.success('✓ Нет дублирования: каждый user — одна запись')
  consolePanel.success('✓ Обновление автора: одна строка в users[]')
  consolePanel.success('✓ Простые reducer: плоский массив, без вложенности')
  consolePanel.success('✓ Каждый слайс — отдельный reducer')
  consolePanel.warn('⚠ Минус: нужно «собирать» данные по ID для отображения')
  consolePanel.warn('⚠ Минус: больше кода для связывания данных')
}

function render(): void {
  const state = store.getState()
  const stateDisplay = document.getElementById('state-display')!
  const structureLabel = document.getElementById('structure-label')!
  const viewLabel = document.getElementById('view-label')!
  const btnNested = document.getElementById('btn-nested')!
  const btnFlat = document.getElementById('btn-flat')!

  if (state.currentView === 'nested') {
    stateDisplay.textContent = JSON.stringify(nestedData, null, 2)
    structureLabel.textContent = 'Вложенный State'
    viewLabel.textContent = 'Режим: Вложенная структура'
    viewLabel.style.color = 'var(--accent-red)'
    btnNested.classList.add('btn--accent')
    btnFlat.classList.remove('btn--accent')
    showNestedAnalysis()
  } else {
    stateDisplay.textContent = JSON.stringify(flatData, null, 2)
    structureLabel.textContent = 'Плоский (Нормализованный) State'
    viewLabel.textContent = 'Режим: Плоская (нормализованная) структура'
    viewLabel.style.color = 'var(--success)'
    btnFlat.classList.add('btn--accent')
    btnNested.classList.remove('btn--accent')
    showFlatAnalysis()
  }
}

store.subscribe(render)
render()

document.getElementById('btn-nested')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'view/switched', payload: 'nested' })
})

document.getElementById('btn-flat')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'view/switched', payload: 'flat' })
})
