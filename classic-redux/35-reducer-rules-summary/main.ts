import { legacy_createStore as createStore } from 'redux'
import { ConsolePanel } from '../shared/console-panel'

interface QuizQuestion {
  code: string
  question: string
  correct: boolean
  explanation: string
  rule: string
}

interface QuizState {
  currentIndex: number
  score: number
  answered: boolean
  finished: boolean
}

interface AnswerAction {
  type: 'quiz/answered'
  payload: boolean
}

interface NextAction {
  type: 'quiz/next'
}

interface RestartAction {
  type: 'quiz/restarted'
}

type QuizAction = AnswerAction | NextAction | RestartAction | { type: string }

const questions: QuizQuestion[] = [
  {
    code: `function reducer(state = { count: 0 }, action) {
  switch (action.type) {
    case 'incremented':
      state.count = state.count + 1
      return state
    default:
      return state
  }
}`,
    question: 'Правильный ли этот reducer?',
    correct: false,
    explanation: 'Мутация state! Строка state.count = ... изменяет оригинальный объект. Нужно: return { ...state, count: state.count + 1 }',
    rule: 'Правило: Иммутабельные обновления'
  },
  {
    code: `function reducer(state = [], action) {
  switch (action.type) {
    case 'item/added':
      return [...state, {
        id: Date.now(),
        text: action.payload
      }]
    default:
      return state
  }
}`,
    question: 'Правильный ли этот reducer?',
    correct: false,
    explanation: 'Date.now() — непредсказуемое значение. Reducer должен быть чистой функцией. ID нужно генерировать в action creator и передавать через payload.',
    rule: 'Правило: Нет случайных/непредсказуемых значений'
  },
  {
    code: `function reducer(state = { data: null }, action) {
  switch (action.type) {
    case 'data/loaded':
      return { ...state, data: action.payload }
    case 'data/cleared':
      return { ...state, data: null }
    default:
      return state
  }
}`,
    question: 'Правильный ли этот reducer?',
    correct: true,
    explanation: 'Да! Чистая функция, иммутабельные обновления через spread, default возвращает state. Всё по правилам.',
    rule: 'Все правила соблюдены ✓'
  },
  {
    code: `async function reducer(state = {}, action) {
  switch (action.type) {
    case 'users/fetch':
      const response = await fetch('/api/users')
      const users = await response.json()
      return { ...state, users }
    default:
      return state
  }
}`,
    question: 'Правильный ли этот reducer?',
    correct: false,
    explanation: 'Reducer не может быть async! fetch — это побочный эффект и асинхронная операция. Асинхронная логика должна быть в middleware (thunk, saga).',
    rule: 'Правило: Нет async, нет побочных эффектов'
  },
  {
    code: `function reducer(state = { items: [] }, action) {
  switch (action.type) {
    case 'item/added':
      return {
        ...state,
        items: [...state.items, action.payload]
      }
    case 'item/removed':
      return {
        ...state,
        items: state.items.filter(
          item => item.id !== action.payload
        )
      }
    default:
      return state
  }
}`,
    question: 'Правильный ли этот reducer?',
    correct: true,
    explanation: 'Да! Spread для добавления, filter для удаления — оба возвращают новый массив. Default возвращает state. Чистая функция.',
    rule: 'Все правила соблюдены ✓'
  },
  {
    code: `function reducer(state = { count: 0 }, action) {
  switch (action.type) {
    case 'incremented':
      return { ...state, count: state.count + 1 }
    case 'decremented':
      return { ...state, count: state.count - 1 }
  }
}`,
    question: 'Правильный ли этот reducer?',
    correct: false,
    explanation: 'Нет default case! Если reducer получит неизвестный action, он вернёт undefined. Обязательно: default: return state',
    rule: 'Правило: Всегда возвращать state для неизвестных actions'
  },
  {
    code: `function reducer(state = { value: 0 }, action) {
  switch (action.type) {
    case 'calculated':
      console.log('Processing:', action.payload)
      localStorage.setItem('last', action.payload)
      return { ...state, value: action.payload }
    default:
      return state
  }
}`,
    question: 'Правильный ли этот reducer?',
    correct: false,
    explanation: 'console.log и localStorage.setItem — побочные эффекты! Reducer должен только вычислять новый state. Логирование и сохранение нужно делать в middleware или подписке.',
    rule: 'Правило: Нет побочных эффектов'
  }
]

const initialState: QuizState = {
  currentIndex: 0,
  score: 0,
  answered: false,
  finished: false
}

function quizReducer(state: QuizState = initialState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'quiz/answered': {
      const userAnswer = (action as AnswerAction).payload
      const isCorrect = userAnswer === questions[state.currentIndex].correct
      return {
        ...state,
        answered: true,
        score: isCorrect ? state.score + 1 : state.score
      }
    }
    case 'quiz/next': {
      const nextIndex = state.currentIndex + 1
      if (nextIndex >= questions.length) {
        return { ...state, finished: true }
      }
      return {
        ...state,
        currentIndex: nextIndex,
        answered: false
      }
    }
    case 'quiz/restarted':
      return { ...initialState }
    default:
      return state
  }
}

const store = createStore(quizReducer)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)
consolePanel.info('Квиз: проверьте знание правил reducer\'ов!')
consolePanel.log(`Всего вопросов: ${questions.length}`)

function render(): void {
  const state = store.getState()
  const questionNum = document.getElementById('question-num')!
  const questionTotal = document.getElementById('question-total')!
  const scoreEl = document.getElementById('score')!
  const quizLabel = document.getElementById('quiz-label')!
  const quizCode = document.getElementById('quiz-code')!
  const quizQuestion = document.getElementById('quiz-question')!
  const quizResult = document.getElementById('quiz-result')!
  const btnYes = document.getElementById('btn-yes')!
  const btnNo = document.getElementById('btn-no')!
  const btnNext = document.getElementById('btn-next')!
  const btnRestart = document.getElementById('btn-restart')!

  questionTotal.textContent = String(questions.length)
  scoreEl.textContent = String(state.score)

  if (state.finished) {
    questionNum.textContent = String(questions.length)
    quizLabel.textContent = 'Результат'
    quizCode.textContent = `Квиз завершён!\n\nВаш результат: ${state.score} / ${questions.length}`
    quizQuestion.textContent = ''
    btnYes.style.display = 'none'
    btnNo.style.display = 'none'
    btnNext.style.display = 'none'
    btnRestart.style.display = 'inline-block'
    quizResult.style.display = 'none'

    consolePanel.clear()
    if (state.score === questions.length) {
      consolePanel.success(`🎉 Отлично! Все ${questions.length} из ${questions.length} правильно!`)
      consolePanel.info('Вы полностью освоили правила reducer\'ов!')
    } else if (state.score >= questions.length * 0.7) {
      consolePanel.success(`👍 Хороший результат: ${state.score} из ${questions.length}`)
      consolePanel.warn('Пройдите квиз ещё раз, чтобы закрепить оставшиеся правила')
    } else {
      consolePanel.warn(`📚 Результат: ${state.score} из ${questions.length}`)
      consolePanel.info('Рекомендуется перечитать теорию и попробовать снова')
    }
    return
  }

  const q = questions[state.currentIndex]
  questionNum.textContent = String(state.currentIndex + 1)
  quizLabel.textContent = `Reducer #${state.currentIndex + 1}`
  quizCode.textContent = q.code
  quizQuestion.textContent = q.question

  btnRestart.style.display = 'none'

  if (state.answered) {
    btnYes.style.display = 'none'
    btnNo.style.display = 'none'
    btnNext.style.display = 'inline-block'
    quizResult.style.display = 'block'

    const userWasRight = (state.score > 0 && state.currentIndex === 0) ||
      quizResult.getAttribute('data-last-correct') === 'true'

    quizResult.innerHTML = ''
    quizResult.style.display = 'block'

    const isLastAnswerCorrect = checkLastAnswer(state)
    quizResult.setAttribute('data-last-correct', String(isLastAnswerCorrect))

    if (isLastAnswerCorrect) {
      quizResult.style.background = 'rgba(78, 175, 80, 0.1)'
      quizResult.style.border = '1px solid var(--success)'
      quizResult.innerHTML = `
        <div style="color: var(--success); font-weight: 700; margin-bottom: 6px;">✓ Правильно!</div>
        <div style="color: var(--text-primary); font-size: 0.85rem;">${q.explanation}</div>
        <div style="color: var(--text-muted); font-size: 0.8rem; margin-top: 6px; font-style: italic;">${q.rule}</div>
      `
    } else {
      quizResult.style.background = 'rgba(244, 71, 71, 0.1)'
      quizResult.style.border = '1px solid var(--accent-red)'
      quizResult.innerHTML = `
        <div style="color: var(--accent-red); font-weight: 700; margin-bottom: 6px;">✕ Неправильно</div>
        <div style="color: var(--text-primary); font-size: 0.85rem;">${q.explanation}</div>
        <div style="color: var(--text-muted); font-size: 0.8rem; margin-top: 6px; font-style: italic;">${q.rule}</div>
      `
    }
  } else {
    btnYes.style.display = 'inline-block'
    btnNo.style.display = 'inline-block'
    btnNext.style.display = 'none'
    quizResult.style.display = 'none'
  }
}

let lastScoreBeforeAnswer = 0

function checkLastAnswer(state: QuizState): boolean {
  return state.score > lastScoreBeforeAnswer
}

store.subscribe(render)
render()

document.getElementById('btn-yes')!.addEventListener('click', (): void => {
  const state = store.getState()
  if (state.answered || state.finished) return
  lastScoreBeforeAnswer = state.score
  store.dispatch({ type: 'quiz/answered', payload: true })
})

document.getElementById('btn-no')!.addEventListener('click', (): void => {
  const state = store.getState()
  if (state.answered || state.finished) return
  lastScoreBeforeAnswer = state.score
  store.dispatch({ type: 'quiz/answered', payload: false })
})

document.getElementById('btn-next')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'quiz/next' })
})

document.getElementById('btn-restart')!.addEventListener('click', (): void => {
  lastScoreBeforeAnswer = 0
  store.dispatch({ type: 'quiz/restarted' })
  consolePanel.clear()
  consolePanel.info('Квиз перезапущен! Удачи!')
})
