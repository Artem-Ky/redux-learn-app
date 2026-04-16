import { produce } from 'immer'
import { ConsolePanel } from '../shared/console-panel'

interface AppState {
  count: number
  items: string[]
}

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)

const initialState: AppState = { count: 0, items: ['apple', 'banana'] }

consolePanel.info('🔍 Immer: подводные камни и правила')
consolePanel.log('')
consolePanel.log('Нажимайте кнопки «Попробовать», чтобы увидеть результат каждой ошибки.')
consolePanel.log('')

// --- Gotcha 1: Мутация draft + return ---
document.getElementById('btn-gotcha1')!.addEventListener('click', (): void => {
  consolePanel.log('━━━ Ошибка #1: Мутация draft + return ━━━')
  consolePanel.log(`Исходное состояние: ${JSON.stringify(initialState)}`)

  try {
    const result = produce(initialState, (draft) => {
      draft.count++
      return { ...draft, count: draft.count + 10 }
    })
    consolePanel.log(`Результат: ${JSON.stringify(result)}`)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    consolePanel.error(`❌ Immer выбросил ошибку: ${msg}`)
    consolePanel.warn('→ Нельзя одновременно мутировать draft И возвращать новое значение!')
  }
  consolePanel.log('')
})

// --- Gotcha 2: Draft вне produce ---
document.getElementById('btn-gotcha2')!.addEventListener('click', (): void => {
  consolePanel.log('━━━ Ошибка #2: Использование draft за пределами produce ━━━')
  consolePanel.log(`Исходное состояние: ${JSON.stringify(initialState)}`)

  let savedDraft: AppState | null = null

  produce(initialState, (draft) => {
    savedDraft = draft as AppState
    draft.count = 99
    consolePanel.log(`Внутри produce: draft.count = ${draft.count} (работает!)`)
  })

  consolePanel.log('Produce завершён. Пробуем использовать сохранённый draft...')

  try {
    consolePanel.log(`savedDraft.count = ${savedDraft!.count}`)
    savedDraft!.count = 42
    consolePanel.log(`Установили savedDraft.count = 42`)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    consolePanel.error(`❌ Ошибка: ${msg}`)
    consolePanel.warn('→ Draft «протух» (revoked)! Proxy отозван после завершения produce.')
  }
  consolePanel.log('')
})

// --- Gotcha 3: Забыли return при полной замене ---
document.getElementById('btn-gotcha3')!.addEventListener('click', (): void => {
  consolePanel.log('━━━ Ошибка #3: Забыли return при замене состояния ━━━')
  consolePanel.log(`Исходное состояние: ${JSON.stringify(initialState)}`)

  const newState: AppState = { count: 100, items: ['cherry'] }

  const withoutReturn = produce(initialState, (_draft) => {
    const _unused: AppState = { ...newState }
    void _unused
  })
  consolePanel.warn(`Без return: ${JSON.stringify(withoutReturn)}`)
  consolePanel.warn(`  → Состояние НЕ изменилось! Immer вернул оригинал.`)
  consolePanel.log(`  → initialState === withoutReturn? ${initialState === withoutReturn}`)

  const withReturn = produce(initialState, (_draft) => {
    return { ...newState }
  })
  consolePanel.success(`С return:  ${JSON.stringify(withReturn)}`)
  consolePanel.success(`  → Состояние заменено! Новый объект.`)
  consolePanel.log(`  → initialState === withReturn? ${initialState === withReturn}`)

  consolePanel.log('')
  consolePanel.info('Бонус: результат produce заморожен (frozen):')
  try {
    (withReturn as AppState).count = 999
    consolePanel.log(`  withReturn.count = ${withReturn.count}`)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    consolePanel.error(`  ❌ ${msg}`)
    consolePanel.warn('  → Object.freeze в действии! produce замораживает результат.')
  }
  consolePanel.log('')
})
