import { ConsolePanel } from '../shared/console-panel'

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — React-Redux Data Flow'
)

// --- Flow Diagram Animation ---

const allSteps = ['step-store', 'step-provider', 'step-selector', 'step-component', 'step-dispatch']
const allArrows = ['arrow-1', 'arrow-2', 'arrow-3', 'arrow-4']

let animating = false

function clearHighlights(): void {
  allSteps.forEach((id) => document.getElementById(id)?.classList.remove('active'))
  allArrows.forEach((id) => {
    const el = document.getElementById(id)
    if (el) el.style.color = ''
  })
}

function highlightStep(stepId: string, arrowBefore?: string): void {
  clearHighlights()
  document.getElementById(stepId)?.classList.add('active')
  if (arrowBefore) {
    const el = document.getElementById(arrowBefore)
    if (el) el.style.color = 'var(--accent)'
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// --- Animation 1: App Startup ---

async function animateStartup(): Promise<void> {
  if (animating) return
  animating = true
  clearHighlights()
  con.info('═══════ АНИМАЦИЯ: Запуск приложения ═══════')
  con.log('')

  // Step 1: createStore
  highlightStep('step-store')
  document.getElementById('step-store-val')!.textContent = 'createStore(counterReducer)'
  con.log('1. Создаём Redux Store:')
  con.log('   const store = createStore(counterReducer)')
  con.log('   Store вызывает reducer с action @@INIT:')
  con.log('   counterReducer(undefined, { type: "@@INIT" }) → { value: 0 }')
  con.log('   Начальный state сохранён: { value: 0 }')
  await sleep(2000)

  // Step 2: Provider
  highlightStep('step-provider', 'arrow-1')
  document.getElementById('step-store-val')!.textContent = '{ value: 0 }'
  con.log('')
  con.log('2. React рендерит <Provider store={store}>:')
  con.log('   Provider берёт store и кладёт его в ReactReduxContext')
  con.log('   Также создаёт объект Subscription — систему подписок')
  con.log('   Теперь любой вложенный компонент может получить доступ к store')
  await sleep(2000)

  // Step 3: useSelector
  highlightStep('step-selector', 'arrow-2')
  document.getElementById('step-selector-val')!.textContent = 'state => state.value → 0'
  con.log('')
  con.log('3. Компонент Counter вызывает useSelector(state => state.value):')
  con.log('   React-Redux достаёт store из Context')
  con.log('   Вызывает selector: selector({ value: 0 }) → 0')
  con.log('   Подписывает компонент на будущие изменения store')
  con.log('   Возвращает значение: 0')
  await sleep(2000)

  // Step 4: Component renders
  highlightStep('step-component', 'arrow-3')
  document.getElementById('step-component-val')!.textContent = 'отображает: 0'
  con.log('')
  con.log('4. Counter рендерится с полученными данными:')
  con.log('   const count = 0  ← из useSelector')
  con.log('   const dispatch = useDispatch()  ← функция для отправки actions')
  con.log('   Рендерит: <span>0</span> и кнопки +/−')
  con.success('')
  con.success('✔ Приложение запущено! Счётчик показывает 0.')
  con.success('  Store создан → Provider передал в Context → useSelector прочитал → UI отрисован')
  con.log('')

  clearHighlights()
  document.getElementById('step-store-val')!.textContent = '{ value: 0 }'
  document.getElementById('step-selector-val')!.textContent = 'state => state.value'
  document.getElementById('step-component-val')!.textContent = 'отображает: 0'
  animating = false
}

// --- Animation 2: Click + button ---

async function animateClick(): Promise<void> {
  if (animating) return
  animating = true
  clearHighlights()
  con.info('═══════ АНИМАЦИЯ: Клик на кнопку + (increment) ═══════')
  con.log('')

  // Step 1: User clicks button → dispatch
  highlightStep('step-component')
  document.getElementById('step-component-val')!.textContent = 'onClick → dispatch!'
  con.log('1. Пользователь кликает кнопку «+»:')
  con.log('   React вызывает onClick handler')
  con.log('   onClick={() => dispatch({ type: "counter/increment" })}')
  await sleep(1800)

  // Step 2: dispatch sends action to store
  highlightStep('step-dispatch', 'arrow-4')
  document.getElementById('step-dispatch-val')!.textContent = '{ type: "counter/increment" }'
  con.log('')
  con.log('2. dispatch отправляет action в Store:')
  con.log('   store.dispatch({ type: "counter/increment" })')
  con.log('   Action — простой объект, описывающий ЧТО произошло')
  await sleep(1800)

  // Step 3: Store calls reducer
  highlightStep('step-store')
  document.getElementById('step-store-val')!.textContent = 'reducer: { value: 0 } → { value: 1 }'
  con.log('')
  con.log('3. Store вызывает reducer:')
  con.log('   counterReducer({ value: 0 }, { type: "counter/increment" })')
  con.log('   case "counter/increment": return { value: 0 + 1 }')
  con.log('   Reducer вернул новый state: { value: 1 }')
  con.log('   Store сохраняет новый state и уведомляет Subscription')
  await sleep(1800)

  // Step 4: useSelector checks
  highlightStep('step-selector', 'arrow-2')
  document.getElementById('step-store-val')!.textContent = '{ value: 1 }'
  document.getElementById('step-selector-val')!.textContent = 'selector: 0 !== 1 → RERENDER!'
  con.log('')
  con.log('4. React-Redux запускает проверку (useSelector):')
  con.log('   Вызывает selector с новым state: selector({ value: 1 }) → 1')
  con.log('   Сравнивает с предыдущим: prevResult(0) !== newResult(1)?')
  con.log('   0 !== 1 → true → НУЖЕН РЕ-РЕНДЕР!')
  await sleep(1800)

  // Step 5: Component re-renders
  highlightStep('step-component', 'arrow-3')
  document.getElementById('step-component-val')!.textContent = 'отображает: 1'
  con.log('')
  con.log('5. Counter ре-рендерится с новым значением:')
  con.log('   useSelector возвращает 1 (новое значение)')
  con.log('   Рендерит: <span>1</span>')
  con.success('')
  con.success('✔ Цикл завершён! Один клик прошёл весь путь:')
  con.success('  Click → dispatch → reducer → store update → selector check → re-render')
  con.success('  state.value: 0 → 1, UI обновлён')
  con.log('')

  clearHighlights()
  document.getElementById('step-store-val')!.textContent = '{ value: 1 }'
  document.getElementById('step-selector-val')!.textContent = 'state => state.value'
  document.getElementById('step-dispatch-val')!.textContent = '{ type: "increment" }'
  animating = false
}

function resetDemo(): void {
  clearHighlights()
  document.getElementById('step-store-val')!.textContent = '{ value: 0 }'
  document.getElementById('step-selector-val')!.textContent = 'state => state.value'
  document.getElementById('step-component-val')!.textContent = 'отображает: 0'
  document.getElementById('step-dispatch-val')!.textContent = '{ type: "increment" }'
  con.clear()
  con.info('Сброшено. Выберите анимацию:')
  con.log('  ① «Запуск приложения» — что происходит при первом рендере')
  con.log('  ② «Клик на кнопку +» — что происходит при dispatch')
}

document.getElementById('btn-startup')!.addEventListener('click', animateStartup)
document.getElementById('btn-cycle')!.addEventListener('click', animateClick)
document.getElementById('btn-reset')!.addEventListener('click', resetDemo)

// --- Problems / Solutions ---

document.getElementById('btn-solve')!.addEventListener('click', () => {
  const cards = document.querySelectorAll('.problem-card')
  let delay = 0
  cards.forEach((card) => {
    setTimeout(() => {
      card.classList.add('solved')
      const num = card.querySelector('.problem-card__num')?.textContent || ''
      con.success(`${num} решена!`)
    }, delay)
    delay += 600
  })

  setTimeout(() => {
    con.info('React-Redux решает все три проблемы из коробки.')
    con.info('В следующем уроке мы покажем каждую проблему на реальном коде.')
  }, delay + 300)
})

// --- Initial log ---

con.info('Добро пожаловать в курс React-Redux!')
con.log('Этот курс из 70 уроков покрывает всю официальную документацию react-redux.js.org')
con.log('')
con.info('Выберите анимацию:')
con.log('  ① «Запуск приложения» — что происходит при создании store, Provider и первом рендере')
con.log('  ② «Клик на кнопку +» — что происходит при dispatch (полный цикл данных)')
