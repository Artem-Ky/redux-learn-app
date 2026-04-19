import { ConsolePanel } from '../shared/console-panel'

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог переключения вкладок'
)

const tabs = document.querySelectorAll<HTMLButtonElement>('.tab')
const panels = document.querySelectorAll<HTMLElement>('.tab-panel')

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab!
    tabs.forEach((t) => t.classList.toggle('tab--active', t === tab))
    panels.forEach((p) => p.classList.toggle('tab-panel--active', p.dataset.panel === target))

    const titles: Record<string, string> = {
      setup: 'Боль 1 — сложный setup store',
      packages: 'Боль 2 — много пакетов',
      boilerplate: 'Боль 3 — много boilerplate',
    }
    con.info(`📑 Открыта вкладка: ${titles[target]}`)
  })
})

con.log('3 вкладки соответствуют 3 болям из официальной документации.')
con.log('Каждая показывает classic vs RTK side-by-side.')
con.info('Сравните количество строк, импортов и явных action-types.')
