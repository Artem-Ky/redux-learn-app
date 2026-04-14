import { ConsolePanel } from '../shared/console-panel'

const con = new ConsolePanel(document.getElementById('console-container')!, 'Сравнение ссылок')

interface MyObj {
  a: number
  b: number
  c: number
}

let original: MyObj = { a: 1, b: 2, c: 3 }

function renderDisplays(result?: { label: string; value: MyObj }): void {
  document.getElementById('original-display')!.textContent = JSON.stringify(original, null, 2)
  if (result) {
    document.getElementById('result-display')!.textContent =
      `${result.label}:\n${JSON.stringify(result.value, null, 2)}`
  } else {
    document.getElementById('result-display')!.textContent = '—'
  }
}

document.getElementById('btn-mutate')!.addEventListener('click', () => {
  const refBefore = original

  con.warn('─── МУТАЦИЯ ───')
  con.log(`До:       original = ${JSON.stringify(original)}`)

  original.b = 999

  con.log(`После:    original = ${JSON.stringify(original)}`)
  con.error(`original === refBefore: ${original === refBefore}  ← та же ссылка!`)
  con.error('Объект изменился, но ссылка осталась прежней.')
  con.error('Redux DevTools НЕ обнаружит это изменение!')
  con.log('')

  renderDisplays({ label: 'Мутированный original', value: original })
})

document.getElementById('btn-immutable')!.addEventListener('click', () => {
  const refBefore = original

  con.success('─── ИММУТАБЕЛЬНОЕ ОБНОВЛЕНИЕ ───')
  con.log(`До:       original = ${JSON.stringify(original)}`)

  const copy: MyObj = { ...original, b: 999 }

  con.log(`После:    copy     = ${JSON.stringify(copy)}`)
  con.log(`          original = ${JSON.stringify(original)}`)
  con.info(`copy === original: ${copy === original}  ← РАЗНЫЕ ссылки`)
  con.success('Оригинал не изменился! Redux может сравнить ссылки и понять, что state обновился.')
  con.log('')

  renderDisplays({ label: 'Копия (spread)', value: copy })
})

document.getElementById('btn-reset')!.addEventListener('click', () => {
  original = { a: 1, b: 2, c: 3 }
  con.clear()
  con.info('Объект сброшен: { a: 1, b: 2, c: 3 }')
  renderDisplays()
})

con.info('Нажимайте кнопки, чтобы увидеть разницу между мутацией и иммутабельным обновлением')
renderDisplays()
