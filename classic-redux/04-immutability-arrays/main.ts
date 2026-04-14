import { ConsolePanel } from '../shared/console-panel'

const con = new ConsolePanel(document.getElementById('console-container')!, 'Операции с массивами')

const INITIAL: string[] = ['яблоко', 'банан', 'вишня']
let arr: string[] = [...INITIAL]

function renderArray(): void {
  document.getElementById('array-display')!.textContent = JSON.stringify(arr, null, 2)
}

function reset(): void {
  arr = [...INITIAL]
  renderArray()
  con.clear()
  con.info(`Массив сброшен: ${JSON.stringify(arr)}`)
}

const operations: Record<string, () => void> = {
  push() {
    const refBefore = arr
    con.warn('─── МУТАЦИЯ: arr.push("новый") ───')
    con.log(`До:    ${JSON.stringify(arr)}`)
    arr.push('новый')
    con.log(`После: ${JSON.stringify(arr)}`)
    con.error(`refBefore === arr: ${refBefore === arr} ← та же ссылка! Redux не заметит.`)
    con.log('')
    renderArray()
  },

  splice() {
    if (arr.length < 2) { con.warn('Нужен хотя бы 2 элемента'); return }
    const refBefore = arr
    con.warn('─── МУТАЦИЯ: arr.splice(1, 1) ───')
    con.log(`До:    ${JSON.stringify(arr)}`)
    arr.splice(1, 1)
    con.log(`После: ${JSON.stringify(arr)}`)
    con.error(`refBefore === arr: ${refBefore === arr} ← та же ссылка!`)
    con.log('')
    renderArray()
  },

  direct() {
    const refBefore = arr
    con.warn('─── МУТАЦИЯ: arr[0] = "X" ───')
    con.log(`До:    ${JSON.stringify(arr)}`)
    arr[0] = 'X'
    con.log(`После: ${JSON.stringify(arr)}`)
    con.error(`refBefore === arr: ${refBefore === arr} ← та же ссылка!`)
    con.log('')
    renderArray()
  },

  sort() {
    const refBefore = arr
    con.warn('─── МУТАЦИЯ: arr.sort() ───')
    con.log(`До:    ${JSON.stringify(arr)}`)
    arr.sort()
    con.log(`После: ${JSON.stringify(arr)}`)
    con.error(`refBefore === arr: ${refBefore === arr} ← та же ссылка! sort() мутирует!`)
    con.log('')
    renderArray()
  },

  'spread-add'() {
    const refBefore = arr
    con.success('─── ИММУТАБЕЛЬНО: [...arr, "новый"] ───')
    con.log(`До:    ${JSON.stringify(arr)}`)
    const newArr = [...arr, 'новый']
    con.log(`Новый: ${JSON.stringify(newArr)}`)
    con.log(`Старый: ${JSON.stringify(arr)} ← не изменился!`)
    con.info(`refBefore === newArr: ${refBefore === newArr} ← разные ссылки`)
    arr = newArr
    con.log('')
    renderArray()
  },

  filter() {
    if (arr.length < 2) { con.warn('Нужен хотя бы 2 элемента'); return }
    const refBefore = arr
    con.success('─── ИММУТАБЕЛЬНО: arr.filter((_, i) => i !== 1) ───')
    con.log(`До:    ${JSON.stringify(arr)}`)
    const newArr = arr.filter((_, i) => i !== 1)
    con.log(`Новый: ${JSON.stringify(newArr)}`)
    con.log(`Старый: ${JSON.stringify(arr)} ← не изменился!`)
    con.info(`refBefore === newArr: ${refBefore === newArr} ← разные ссылки`)
    arr = newArr
    con.log('')
    renderArray()
  },

  map() {
    const refBefore = arr
    con.success('─── ИММУТАБЕЛЬНО: arr.map(обновить [0]) ───')
    con.log(`До:    ${JSON.stringify(arr)}`)
    const newArr = arr.map((item, i) => i === 0 ? 'ОБНОВЛЕНО' : item)
    con.log(`Новый: ${JSON.stringify(newArr)}`)
    con.log(`Старый: ${JSON.stringify(arr)} ← не изменился!`)
    con.info(`refBefore === newArr: ${refBefore === newArr} ← разные ссылки`)
    arr = newArr
    con.log('')
    renderArray()
  },

  'slice-sort'() {
    const refBefore = arr
    con.success('─── ИММУТАБЕЛЬНО: [...arr].sort() ───')
    con.log(`До:    ${JSON.stringify(arr)}`)
    const newArr = [...arr].sort()
    con.log(`Новый: ${JSON.stringify(newArr)}`)
    con.log(`Старый: ${JSON.stringify(arr)} ← не изменился!`)
    con.info(`refBefore === newArr: ${refBefore === newArr} ← разные ссылки`)
    arr = newArr
    con.log('')
    renderArray()
  },
}

document.querySelectorAll<HTMLButtonElement>('[data-op]').forEach(btn => {
  btn.addEventListener('click', () => {
    const op = btn.dataset.op!
    if (operations[op]) operations[op]()
  })
})

document.getElementById('btn-reset')!.addEventListener('click', reset)

con.info('Нажимайте кнопки, чтобы сравнить мутирующие и иммутабельные операции')
renderArray()
