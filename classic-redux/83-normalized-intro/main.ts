import { legacy_createStore as createStore, applyMiddleware } from 'redux'
import { thunk } from 'redux-thunk'
import { ConsolePanel } from '../shared/console-panel'

interface Author {
  id: number
  name: string
  avatar: string
}

interface DenormalizedPost {
  id: number
  title: string
  body: string
  author: Author
}

interface NormalizedPost {
  id: number
  title: string
  body: string
  authorId: number
}

interface DenormalizedData {
  posts: DenormalizedPost[]
}

interface NormalizedData {
  authors: Record<number, Author>
  posts: Record<number, NormalizedPost>
  postIds: number[]
}

interface AppState {
  view: 'denormalized' | 'normalized'
  denormalized: DenormalizedData
  normalized: NormalizedData
}

interface SetViewAction {
  type: 'view/set'
  payload: 'denormalized' | 'normalized'
}

type AppAction = SetViewAction | { type: string }

const authors: Author[] = [
  { id: 1, name: 'Иван Петров', avatar: '👨‍💻' },
  { id: 2, name: 'Мария Сидорова', avatar: '👩‍💻' }
]

const denormalizedPosts: DenormalizedPost[] = [
  { id: 1, title: 'Введение в Redux', body: 'Redux — это предсказуемый контейнер состояния...', author: authors[0] },
  { id: 2, title: 'Middleware паттерны', body: 'Middleware перехватывает действия перед reducer...', author: authors[1] },
  { id: 3, title: 'Redux и TypeScript', body: 'TypeScript добавляет типобезопасность в Redux...', author: authors[0] },
  { id: 4, title: 'Нормализация данных', body: 'Нормализация убирает дубликаты из state...', author: authors[1] },
  { id: 5, title: 'Продвинутые редюсеры', body: 'Композиция и higher-order редюсеры...', author: authors[0] }
]

const normalizedData: NormalizedData = {
  authors: {
    1: authors[0],
    2: authors[1]
  },
  posts: {
    1: { id: 1, title: 'Введение в Redux', body: 'Redux — это предсказуемый контейнер состояния...', authorId: 1 },
    2: { id: 2, title: 'Middleware паттерны', body: 'Middleware перехватывает действия перед reducer...', authorId: 2 },
    3: { id: 3, title: 'Redux и TypeScript', body: 'TypeScript добавляет типобезопасность в Redux...', authorId: 1 },
    4: { id: 4, title: 'Нормализация данных', body: 'Нормализация убирает дубликаты из state...', authorId: 2 },
    5: { id: 5, title: 'Продвинутые редюсеры', body: 'Композиция и higher-order редюсеры...', authorId: 1 }
  },
  postIds: [1, 2, 3, 4, 5]
}

const initialState: AppState = {
  view: 'denormalized',
  denormalized: { posts: denormalizedPosts },
  normalized: normalizedData
}

function appReducer(state: AppState = initialState, action: AppAction): AppState {
  switch (action.type) {
    case 'view/set':
      return { ...state, view: (action as SetViewAction).payload }
    default:
      return state
  }
}

const store = createStore(appReducer, applyMiddleware(thunk as any))

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

const btnDenorm = document.getElementById('btn-denorm')!
const btnNorm = document.getElementById('btn-norm')!
const denormDisplay = document.getElementById('denorm-display')!
const normDisplay = document.getElementById('norm-display')!
const activeDisplay = document.getElementById('active-display')!

function calculateSize(obj: any): number {
  return JSON.stringify(obj).length
}

function render(): void {
  const state = store.getState() as AppState

  denormDisplay.textContent = JSON.stringify(state.denormalized, null, 2)
  normDisplay.textContent = JSON.stringify(state.normalized, null, 2)

  if (state.view === 'denormalized') {
    btnDenorm.className = 'btn btn--accent'
    btnNorm.className = 'btn'
    activeDisplay.textContent = 'Активный вид: ДЕНОРМАЛИЗОВАННЫЕ данные'
    activeDisplay.style.color = 'var(--accent-orange)'
  } else {
    btnDenorm.className = 'btn'
    btnNorm.className = 'btn btn--accent'
    activeDisplay.textContent = 'Активный вид: НОРМАЛИЗОВАННЫЕ данные'
    activeDisplay.style.color = 'var(--accent-cyan)'
  }
}

store.subscribe(render)
render()

const denormSize = calculateSize(initialState.denormalized)
const normSize = calculateSize(initialState.normalized)

consolePanel.info('Нормализация vs Денормализация')
consolePanel.log('')
consolePanel.log('📊 Сравнение размера данных:', 'color: #dcdcaa')
consolePanel.log(`   Денормализованные: ${denormSize} символов`, 'color: #ce9178')
consolePanel.log(`   Нормализованные:   ${normSize} символов`, 'color: #4ec9b0')
consolePanel.log('')

const authorDuplicates = denormalizedPosts.filter((p: DenormalizedPost) => p.author.id === 1).length
consolePanel.log(`⚠️ Автор "Иван Петров" дублируется ${authorDuplicates} раз(а) в денормализованных данных`, 'color: #ff9800')
consolePanel.log(`✅ В нормализованных данных автор хранится в ОДНОМ месте: authors[1]`, 'color: #4caf50')
consolePanel.log('')
consolePanel.log('Проблема: если Иван сменит имя, нужно обновить все ' + authorDuplicates + ' копии', 'color: #f44747')
consolePanel.log('Решение: в нормализованных данных обновляем только authors[1].name', 'color: #4caf50')

btnDenorm.addEventListener('click', (): void => {
  store.dispatch({ type: 'view/set', payload: 'denormalized' })
  consolePanel.log('')
  consolePanel.log('👁️ Переключено на ДЕНОРМАЛИЗОВАННЫЙ вид', 'color: #ce9178')
  consolePanel.log('   Обратите внимание: author — полный объект в каждом посте', 'color: #ce9178')
})

btnNorm.addEventListener('click', (): void => {
  store.dispatch({ type: 'view/set', payload: 'normalized' })
  consolePanel.log('')
  consolePanel.log('👁️ Переключено на НОРМАЛИЗОВАННЫЙ вид', 'color: #4ec9b0')
  consolePanel.log('   authors и posts — отдельные сущности, связь через authorId', 'color: #4ec9b0')
})
