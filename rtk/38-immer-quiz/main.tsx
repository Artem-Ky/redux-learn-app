import { configureStore, createSlice } from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface QuizItem {
  title: string
  code: string
  expected: 'ok' | 'fail'
  explain: string
  test: () => { passed: boolean; result: string }
}

function makeStore<S>(initialState: S, reducerFn: (s: S) => S | void) {
  const slice = createSlice({
    name: 'q',
    initialState,
    reducers: {
      run: (s) => reducerFn(s as S),
    },
  })
  return configureStore({
    reducer: slice.reducer,
    middleware: (gdm) => gdm({ immutableCheck: false, serializableCheck: false }),
  })
}

const quiz: QuizItem[] = [
  {
    title: '1. Мутация поля',
    code: `(state) => { state.value++ }`,
    expected: 'ok',
    explain: 'Стандартная мутация draft. Immer создаст новый объект.',
    test: () => {
      const store = makeStore({ value: 0 }, (s: { value: number }) => { s.value++ })
      store.dispatch({ type: 'q/run' })
      const v = (store.getState() as { value: number }).value
      return { passed: v === 1, result: `state.value = ${v}` }
    },
  },
  {
    title: '2. Замена всего state присваиванием',
    code: `(state) => { state = { value: 99 } }`,
    expected: 'fail',
    explain: 'Нельзя присвоить переменной — это локальная переменная, не draft. Нужно ИЛИ мутация поля, ИЛИ return.',
    test: () => {
      const store = makeStore({ value: 0 }, ((s: { value: number }) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        let local = s
        local = { value: 99 } as { value: number }
        return undefined
      }) as (s: { value: number }) => { value: number } | void)
      store.dispatch({ type: 'q/run' })
      const v = (store.getState() as { value: number }).value
      return { passed: v === 0, result: `state.value = ${v} (а вы хотели 99?)` }
    },
  },
  {
    title: '3. Замена через return',
    code: `(state) => { return { value: 99 } }`,
    expected: 'ok',
    explain: 'Return нового объекта работает — Immer заменит state целиком.',
    test: () => {
      const store = makeStore({ value: 0 }, () => ({ value: 99 }))
      store.dispatch({ type: 'q/run' })
      const v = (store.getState() as { value: number }).value
      return { passed: v === 99, result: `state.value = ${v}` }
    },
  },
  {
    title: '4. Мутация + return',
    code: `(state) => { state.value++; return { value: 99 } }`,
    expected: 'fail',
    explain: 'Запрещено! Immer выкинет ошибку: "An immer producer returned a new value AND modified its draft".',
    test: () => {
      try {
        const store = makeStore({ value: 0 }, ((s: { value: number }) => {
          s.value++
          return { value: 99 }
        }) as (s: { value: number }) => { value: number } | void)
        store.dispatch({ type: 'q/run' })
        const v = (store.getState() as { value: number }).value
        return { passed: false, result: `состояние = ${v} (Immer не выкинул ошибку — может быть production-моде?)` }
      } catch (e) {
        return { passed: true, result: `Error: ${(e as Error).message.slice(0, 80)}` }
      }
    },
  },
  {
    title: '5. push в массив',
    code: `(state) => { state.list.push(42) }`,
    expected: 'ok',
    explain: 'push на draft-массиве работает — Immer перехватит мутацию.',
    test: () => {
      const store = makeStore({ list: [] as number[] }, (s) => { s.list.push(42) })
      store.dispatch({ type: 'q/run' })
      const arr = (store.getState() as { list: number[] }).list
      return { passed: arr.length === 1 && arr[0] === 42, result: `state.list = ${JSON.stringify(arr)}` }
    },
  },
  {
    title: '6. Замена массива через filter',
    code: `(state) => { state.list = state.list.filter(x => x > 5) }`,
    expected: 'ok',
    explain: 'Присваивание полю draft нового массива — это валидная мутация поля.',
    test: () => {
      const store = makeStore({ list: [1, 6, 3, 8] }, (s) => { s.list = s.list.filter((x) => x > 5) })
      store.dispatch({ type: 'q/run' })
      const arr = (store.getState() as { list: number[] }).list
      return { passed: JSON.stringify(arr) === '[6,8]', result: `state.list = ${JSON.stringify(arr)}` }
    },
  },
  {
    title: '7. delete поля',
    code: `(state) => { delete state.x }`,
    expected: 'ok',
    explain: 'delete на draft работает — поле удалится из result.',
    test: () => {
      const store = makeStore({ x: 1, y: 2 } as { x?: number; y: number }, (s) => { delete s.x })
      store.dispatch({ type: 'q/run' })
      const st = store.getState() as { x?: number; y: number }
      return { passed: !('x' in st), result: `state = ${JSON.stringify(st)}` }
    },
  },
  {
    title: '8. Замена draft переменной (без return)',
    code: `(state) => { Object.assign(state, { value: 100 }) }`,
    expected: 'ok',
    explain: 'Object.assign(draft, {...}) — копирует поля в draft. Работает.',
    test: () => {
      const store = makeStore({ value: 0, other: 1 }, (s) => { Object.assign(s, { value: 100 }) })
      store.dispatch({ type: 'q/run' })
      const st = store.getState() as { value: number; other: number }
      return { passed: st.value === 100 && st.other === 1, result: `state = ${JSON.stringify(st)}` }
    },
  },
  {
    title: '9. Изменение примитивного state без return',
    code: `(state /* state = 0 */) => { state++ /* без return */ }`,
    expected: 'fail',
    explain: 'Примитивы (number/string) — НЕ объект, мутировать нельзя. Нужен return: (state) => state + 1.',
    test: () => {
      const store = makeStore<number>(0, ((s: number) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        let _local = s
        _local++
      }) as (s: number) => number | void)
      store.dispatch({ type: 'q/run' })
      const v = store.getState() as number
      return { passed: v === 0, result: `state = ${v} (хотел 1, но не сработало)` }
    },
  },
  {
    title: '10. return undefined эквивалентно отсутствию return',
    code: `(state) => { state.value++; return undefined }`,
    expected: 'ok',
    explain: 'return undefined специально разрешён — Immer его игнорирует.',
    test: () => {
      const store = makeStore({ value: 0 }, ((s: { value: number }) => {
        s.value++
        return undefined
      }) as (s: { value: number }) => { value: number } | void)
      store.dispatch({ type: 'q/run' })
      const v = (store.getState() as { value: number }).value
      return { passed: v === 1, result: `state.value = ${v}` }
    },
  },
]

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог Immer quiz')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(makeStore({ initial: true }, () => {}))

const container = document.getElementById('quiz-container')!
const scoreEl = document.getElementById('score')!
const answers: Record<number, 'ok' | 'fail' | null> = {}
const results: Record<number, { userCorrect: boolean; resultText: string }> = {}

function updateScore(): void {
  const correct = Object.values(results).filter((r) => r.userCorrect).length
  scoreEl.textContent = `${correct}/${quiz.length}`
}

function renderQuiz(): void {
  container.innerHTML = quiz.map((q, i) => {
    const r = results[i]
    const locked = !!r
    const cardClass = locked ? (r.userCorrect ? 'passed' : 'failed') : 'unknown'
    const disabled = locked ? 'disabled' : ''
    const verdictHtml = locked
      ? `
        <div class="quiz-card__verdict ${r.userCorrect ? 'ok' : 'wrong'}">
          ${r.userCorrect ? '✓ ваш ответ правильный' : `✗ правильный ответ: ${q.expected === 'ok' ? '✓ работает' : '✗ ошибка'}`}
        </div>
        <div class="quiz-card__expl"><strong>Что произошло:</strong> ${r.resultText}</div>
        <div class="quiz-card__expl"><strong>Объяснение:</strong> ${q.explain}</div>
      `
      : ''
    return `
    <div class="quiz-card ${cardClass}" id="card-${i}">
      <div class="quiz-card__title">${q.title}</div>
      <div class="code-block">${q.code}</div>
      <div class="quiz-card__answer">
        <span style="font-size: .82rem; color: var(--text-secondary);">Ваш ответ:</span>
        <button class="btn ${answers[i] === 'ok' ? 'selected-ok' : ''}" data-q="${i}" data-ans="ok" ${disabled}>✓ работает</button>
        <button class="btn ${answers[i] === 'fail' ? 'selected-fail' : ''}" data-q="${i}" data-ans="fail" ${disabled}>✗ ошибка</button>
        <button class="btn" data-run="${i}" ${disabled} style="margin-left: auto;">${locked ? 'запущено ✓' : 'запустить'}</button>
      </div>
      <div id="verdict-${i}">${verdictHtml}</div>
    </div>
  `
  }).join('')

  container.querySelectorAll<HTMLButtonElement>('[data-ans]').forEach((b) => {
    b.addEventListener('click', () => {
      if (b.disabled) return
      const i = Number(b.dataset.q)
      if (results[i]) return
      answers[i] = b.dataset.ans as 'ok' | 'fail'
      renderQuiz()
    })
  })

  container.querySelectorAll<HTMLButtonElement>('[data-run]').forEach((b) => {
    b.addEventListener('click', () => {
      if (b.disabled) return
      const i = Number(b.dataset.run)
      if (results[i]) return
      const q = quiz[i]

      let passed = false
      let resultText = ''
      try {
        const r = q.test()
        passed = r.passed
        resultText = r.result
      } catch (e) {
        passed = q.expected === 'fail'
        resultText = `(исключение) ${(e as Error).message.slice(0, 140)}`
      }
      const actuallyOk = passed
      const userCorrect =
        (q.expected === 'ok' && actuallyOk && answers[i] === 'ok') ||
        (q.expected === 'fail' && answers[i] === 'fail')

      results[i] = { userCorrect, resultText }
      con.info(`Q${i + 1}: ожидание=${q.expected}, фактически=${actuallyOk ? 'ok' : 'fail'}, ваш ответ=${answers[i] ?? '—'}`)
      renderQuiz()
      updateScore()
    })
  })
}
renderQuiz()
updateScore()

document.getElementById('reset-quiz')!.addEventListener('click', () => {
  for (const k of Object.keys(answers)) delete answers[Number(k)]
  for (const k of Object.keys(results)) delete results[Number(k)]
  renderQuiz()
  updateScore()
})

con.log('Quiz по правилам Immer в reducer'+'ах. Выберите ответ → запустите → сверьтесь.')
con.info('Ответы основаны на live-исполнении: каждый сценарий запускается в реальном RTK store.')
