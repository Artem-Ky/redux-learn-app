import { ConsolePanel } from '../shared/console-panel'

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог установки и tree-shaking'
)

const COMMANDS: Record<string, string> = {
  npm: 'npm install @reduxjs/toolkit react-redux',
  yarn: 'yarn add @reduxjs/toolkit react-redux',
  pnpm: 'pnpm add @reduxjs/toolkit react-redux',
  bun: 'bun add @reduxjs/toolkit react-redux',
}

const cmdOut = document.getElementById('install-cmd')!
document.querySelectorAll<HTMLButtonElement>('.install-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.install-tab').forEach((t) => t.classList.remove('active'))
    tab.classList.add('active')
    const pm = tab.dataset.pm!
    cmdOut.textContent = COMMANDS[pm]
    con.info(`Сменили package manager: ${pm}`)
  })
})

const treeshakeBtn = document.getElementById('show-treeshake')!
const treeshakeOut = document.getElementById('treeshake-output')!

treeshakeBtn.addEventListener('click', () => {
  treeshakeOut.innerHTML = `
    <div style="background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 16px; font-family: var(--font-mono); font-size: .8rem;">
      <div style="color: var(--text-muted); margin-bottom: 6px;">// если в коде только это:</div>
      <div style="color: var(--accent-cyan);">import { configureStore, createSlice } from '@reduxjs/toolkit'</div>
      <div style="margin-top: 12px; color: var(--text-muted);">// в бандл попадает:</div>
      <ul style="list-style: none; padding-left: 0; margin: 6px 0;">
        <li style="color: var(--success);">✓ configureStore (~2 kB)</li>
        <li style="color: var(--success);">✓ createSlice → createReducer → createAction (~3 kB)</li>
        <li style="color: var(--success);">✓ immer (~6 kB, нужен для reducer-mutate)</li>
        <li style="color: var(--success);">✓ redux core (combineReducers, applyMiddleware, ~1.5 kB)</li>
        <li style="color: var(--success);">✓ default middleware: serializable, immutable, action invariant (~1.5 kB)</li>
      </ul>
      <div style="color: var(--text-muted); margin-top: 12px;">// удаляется tree-shaker:</div>
      <ul style="list-style: none; padding-left: 0; margin: 6px 0;">
        <li style="color: var(--accent-red);">✗ createApi, fetchBaseQuery (~9 kB) — RTK Query</li>
        <li style="color: var(--accent-red);">✗ createEntityAdapter (~1 kB) — если не используется</li>
        <li style="color: var(--accent-red);">✗ createListenerMiddleware (~2 kB) — если не используется</li>
        <li style="color: var(--accent-red);">✗ createAsyncThunk (~1 kB) — если не используется</li>
        <li style="color: var(--accent-red);">✗ reselect → createSelector (~1 kB) — если не импортирован</li>
      </ul>
      <div style="margin-top: 12px; padding: 8px 12px; background: var(--bg-tertiary); border-radius: var(--radius-sm); color: var(--accent-yellow);">
        Итог: ~14 kB в бандле вместо полных 28 kB.
      </div>
    </div>
  `
  con.success('✓ Tree-shaking разобран. Не используете API → его не будет в бандле.')
})

con.log('Кликайте вкладки package manager — команда обновится.')
con.info('Главное правило: один пакет @reduxjs/toolkit содержит ВСЁ — redux, immer, reselect, thunk, RTK Query.')
con.warn('peer dependencies (react, react-redux) ставите сами.')
