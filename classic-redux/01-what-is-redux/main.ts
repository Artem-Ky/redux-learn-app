import { ConsolePanel } from '../shared/console-panel'

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог потока данных')

const steps = ['step-action', 'step-dispatch', 'step-reducer', 'step-store', 'step-ui']

const messages = [
  '1. ACTION — Создаём объект: { type: "counter/incremented" }',
  '2. DISPATCH — Отправляем action в store через store.dispatch(action)',
  '3. REDUCER — Store вызывает reducer(currentState, action) → вычисляет новый state',
  '4. STORE — Сохраняет новое состояние, оповещает подписчиков',
  '5. UI — Подписчик получает уведомление, читает getState() и обновляет интерфейс',
]

let currentStep = -1
let animating = false

function clearHighlights(): void {
  steps.forEach(id => {
    document.getElementById(id)?.classList.remove('active')
  })
}

async function runCycle(): Promise<void> {
  if (animating) return
  animating = true
  clearHighlights()
  con.info('─── Начинаем цикл Redux ───')

  for (let i = 0; i < steps.length; i++) {
    currentStep = i
    clearHighlights()
    document.getElementById(steps[i])?.classList.add('active')
    con.log(messages[i])
    await sleep(900)
  }

  con.success('✔ Цикл завершён! State обновлён, UI перерисован.')
  con.log('')
  animating = false
}

function resetDemo(): void {
  clearHighlights()
  currentStep = -1
  con.clear()
  con.info('Нажмите «Пройти цикл» чтобы начать')
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

document.getElementById('btn-cycle')!.addEventListener('click', runCycle)
document.getElementById('btn-reset')!.addEventListener('click', resetDemo)

con.info('Нажмите «Пройти цикл» чтобы увидеть как данные проходят через Redux')
