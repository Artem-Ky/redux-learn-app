import { ConsolePanel } from '../shared/console-panel'

const con = new ConsolePanel(document.getElementById('console-container')!, 'Результаты вызовов')

function add(a: number, b: number): number {
  return a + b
}

let callCount = 0
function addImpure(a: number, b: number): string {
  callCount++
  return `${a + b} (call #${callCount} at ${Date.now()})`
}

document.getElementById('btn-pure-1')!.addEventListener('click', () => {
  const result = add(2, 3)
  con.success(`add(2, 3) = ${result}`)
})

document.getElementById('btn-pure-2')!.addEventListener('click', () => {
  const result = add(10, 20)
  con.success(`add(10, 20) = ${result}`)
})

document.getElementById('btn-pure-3')!.addEventListener('click', () => {
  const result = add(2, 3)
  con.success(`add(2, 3) = ${result}  ← ВСЕГДА одинаковый результат для одинаковых аргументов!`)
})

document.getElementById('btn-impure-1')!.addEventListener('click', () => {
  const result = addImpure(2, 3)
  con.error(`addImpure(2, 3) = "${result}"`)
})

document.getElementById('btn-impure-2')!.addEventListener('click', () => {
  const result = addImpure(10, 20)
  con.error(`addImpure(10, 20) = "${result}"`)
})

document.getElementById('btn-impure-3')!.addEventListener('click', () => {
  const result = addImpure(2, 3)
  con.error(`addImpure(2, 3) = "${result}"  ← Результат ОТЛИЧАЕТСЯ от первого вызова!`)
  con.warn('Нечистая функция зависит от внешнего callCount и Date.now() — непредсказуема.')
})

con.info('Нажимайте кнопки и сравнивайте результаты чистой и нечистой функций')
con.log('Чистая: одинаковый вход → одинаковый выход. Нечистая: результат зависит от внешних факторов.')
