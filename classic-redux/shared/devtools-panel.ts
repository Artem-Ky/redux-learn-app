import type { Store, Action } from 'redux'

interface StateSnapshot {
  action: Action & { [key: string]: unknown }
  stateBefore: unknown
  stateAfter: unknown
  timestamp: number
  skipped: boolean
}

type ActiveTab = 'action' | 'state' | 'diff'

const PERSIST_KEY = 'redux-devtools-snapshots'

const CSS = `
.devtools {
  background: #1b1b1b;
  border: 1px solid #333;
  border-radius: 6px;
  overflow: hidden;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 0.8rem;
  display: flex;
  flex-direction: column;
}

/* ── Toolbar ── */
.devtools__toolbar {
  background: #2d2d2d;
  border-bottom: 1px solid #333;
  padding: 4px 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  user-select: none;
  flex-wrap: wrap;
}

.devtools__toolbar-title {
  color: #999;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.devtools__toolbar-title svg {
  width: 14px;
  height: 14px;
}

.devtools__toolbar-actions {
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
}

.devtools__toolbar-btn {
  background: none;
  border: 1px solid transparent;
  color: #888;
  padding: 3px 7px;
  border-radius: 3px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.68rem;
  transition: background 0.15s, color 0.15s;
  display: flex;
  align-items: center;
  gap: 3px;
  white-space: nowrap;
}

.devtools__toolbar-btn:hover {
  background: #3c3c3c;
  color: #ccc;
}

.devtools__toolbar-btn--active {
  background: #3c3c3c;
  color: #569cd6;
  border-color: #569cd6;
}

.devtools__toolbar-btn[disabled] {
  opacity: 0.35;
  cursor: default;
  pointer-events: none;
}

/* ── Main layout ── */
.devtools__main {
  display: flex;
  min-height: 260px;
  max-height: 520px;
}

/* ── Actions list (left) ── */
.devtools__actions-list {
  width: 240px;
  min-width: 180px;
  border-right: 1px solid #333;
  overflow-y: auto;
  flex-shrink: 0;
}

.devtools__action-item {
  padding: 4px 6px 4px 8px;
  cursor: pointer;
  border-bottom: 1px solid rgba(255,255,255,0.03);
  display: flex;
  align-items: center;
  gap: 4px;
  transition: background 0.1s;
  position: relative;
}

.devtools__action-item:hover {
  background: #2a2d2e;
}

.devtools__action-item--selected {
  background: #264f78 !important;
}

.devtools__action-item--skipped {
  opacity: 0.4;
}

.devtools__action-item--skipped .devtools__action-type {
  text-decoration: line-through;
}

.devtools__action-item--jumped {
  border-left: 3px solid #569cd6;
}

.devtools__action-idx {
  color: #555;
  font-size: 0.62rem;
  min-width: 18px;
  flex-shrink: 0;
}

.devtools__action-type {
  color: #ccc;
  font-size: 0.76rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.devtools__action-time {
  color: #444;
  font-size: 0.58rem;
  flex-shrink: 0;
}

.devtools__action-btns {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s;
}

.devtools__action-item:hover .devtools__action-btns {
  opacity: 1;
}

.devtools__action-mini-btn {
  background: none;
  border: none;
  color: #777;
  cursor: pointer;
  font-size: 0.65rem;
  padding: 2px 4px;
  border-radius: 2px;
  font-family: inherit;
  line-height: 1;
}

.devtools__action-mini-btn:hover {
  background: #444;
  color: #fff;
}

.devtools__action-mini-btn--skip-active {
  color: #f44747;
}

/* ── Detail (right) ── */
.devtools__detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.devtools__tabs {
  display: flex;
  background: #252526;
  border-bottom: 1px solid #333;
}

.devtools__tab {
  padding: 6px 14px;
  cursor: pointer;
  color: #888;
  font-size: 0.73rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
  font-family: inherit;
  background: none;
  border-top: none;
  border-left: none;
  border-right: none;
}

.devtools__tab:hover {
  color: #ccc;
}

.devtools__tab--active {
  color: #569cd6;
  border-bottom-color: #569cd6;
}

.devtools__content {
  flex: 1;
  overflow: auto;
  padding: 10px 12px;
}

.devtools__empty {
  color: #555;
  text-align: center;
  padding: 40px 20px;
  font-style: italic;
}

/* ── Dispatcher panel ── */
.devtools__dispatcher {
  border-top: 1px solid #333;
  background: #222;
  padding: 8px 10px;
  display: none;
}

.devtools__dispatcher--visible {
  display: flex;
  gap: 6px;
  align-items: flex-end;
}

.devtools__dispatcher textarea {
  flex: 1;
  background: #1b1b1b;
  border: 1px solid #444;
  color: #ccc;
  font-family: inherit;
  font-size: 0.75rem;
  padding: 6px 8px;
  border-radius: 3px;
  resize: vertical;
  min-height: 32px;
  max-height: 120px;
  outline: none;
}

.devtools__dispatcher textarea:focus {
  border-color: #569cd6;
}

.devtools__dispatcher-send {
  background: #264f78;
  border: 1px solid #569cd6;
  color: #fff;
  padding: 6px 12px;
  border-radius: 3px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.72rem;
  white-space: nowrap;
}

.devtools__dispatcher-send:hover {
  background: #1a6fb5;
}

/* ── Slider ── */
.devtools__slider-container {
  border-top: 1px solid #333;
  background: #222;
  padding: 6px 12px;
  display: none;
  align-items: center;
  gap: 8px;
}

.devtools__slider-container--visible {
  display: flex;
}

.devtools__slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  background: #444;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.devtools__slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #569cd6;
  cursor: pointer;
  border: 2px solid #1b1b1b;
}

.devtools__slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #569cd6;
  cursor: pointer;
  border: 2px solid #1b1b1b;
}

.devtools__slider-label {
  color: #888;
  font-size: 0.65rem;
  min-width: 40px;
  text-align: center;
  flex-shrink: 0;
}

.devtools__slider-play {
  background: none;
  border: 1px solid #555;
  color: #aaa;
  padding: 2px 8px;
  border-radius: 3px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.68rem;
}

.devtools__slider-play:hover {
  background: #333;
  color: #fff;
}

/* ── Status bar ── */
.devtools__status {
  background: #1e1e1e;
  border-top: 1px solid #333;
  padding: 4px 10px;
  font-size: 0.66rem;
  color: #666;
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

/* ── JSON tree ── */
.json-tree {
  line-height: 1.7;
  font-size: 0.78rem;
  margin: 0;
  white-space: pre;
}

.json-key { color: #9cdcfe; }
.json-str { color: #ce9178; }
.json-num { color: #b5cea8; }
.json-bool { color: #569cd6; }
.json-null { color: #569cd6; font-style: italic; }
.json-bracket { color: #888; }

.json-row {
  display: block;
  padding: 0 4px;
  border-radius: 2px;
}

.json-row:hover {
  background: rgba(255,255,255,0.04);
}

.json-toggle {
  cursor: pointer;
  user-select: none;
  display: inline-block;
  width: 14px;
  text-align: center;
  color: #888;
  font-size: 0.6rem;
  transition: transform 0.15s;
}

.json-toggle--open {
  transform: rotate(90deg);
}

.json-collapsed-preview {
  color: #555;
  font-style: italic;
  font-size: 0.72rem;
}

/* ── Diff ── */
.diff-added {
  color: #4caf50;
  background: rgba(76,175,80,0.08);
  padding: 2px 6px;
  border-radius: 2px;
  display: block;
}

.diff-added::before {
  content: '+ ';
  font-weight: 700;
}

.diff-removed {
  color: #f44747;
  text-decoration: line-through;
  opacity: 0.8;
  background: rgba(244,71,71,0.08);
  padding: 2px 6px;
  border-radius: 2px;
  display: block;
}

.diff-removed::before {
  content: '− ';
  font-weight: 700;
}

.diff-unchanged {
  color: #555;
  padding: 20px;
  text-align: center;
}

.diff-section {
  margin-bottom: 10px;
  border-left: 3px solid #444;
  padding-left: 10px;
}

.diff-path {
  color: #dcdcaa;
  font-weight: 600;
  margin-bottom: 2px;
  font-size: 0.76rem;
}
`

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildJsonTreeDOM(data: unknown, indent: number = 0): HTMLElement {
  const wrap = document.createElement('span')

  if (data === null) { wrap.innerHTML = `<span class="json-null">null</span>`; return wrap }
  if (data === undefined) { wrap.innerHTML = `<span class="json-null">undefined</span>`; return wrap }
  if (typeof data === 'string') { wrap.innerHTML = `<span class="json-str">"${escapeHtml(data)}"</span>`; return wrap }
  if (typeof data === 'number') { wrap.innerHTML = `<span class="json-num">${data}</span>`; return wrap }
  if (typeof data === 'boolean') { wrap.innerHTML = `<span class="json-bool">${data}</span>`; return wrap }

  const isArray = Array.isArray(data)
  const entries = isArray
    ? (data as unknown[]).map((v, i) => [String(i), v] as [string, unknown])
    : Object.entries(data as Record<string, unknown>)

  if (entries.length === 0) {
    wrap.innerHTML = `<span class="json-bracket">${isArray ? '[]' : '{}'}</span>`
    return wrap
  }

  const openBracket = isArray ? '[' : '{'
  const closeBracket = isArray ? ']' : '}'
  const pad = '  '.repeat(indent)
  const padInner = '  '.repeat(indent + 1)

  let collapsed = indent >= 2

  const toggle = document.createElement('span')
  toggle.className = `json-toggle ${collapsed ? '' : 'json-toggle--open'}`
  toggle.textContent = '▶'
  wrap.appendChild(toggle)

  const bracketOpen = document.createElement('span')
  bracketOpen.className = 'json-bracket'
  bracketOpen.textContent = openBracket
  wrap.appendChild(bracketOpen)

  const preview = document.createElement('span')
  preview.className = 'json-collapsed-preview'
  const previewCount = isArray ? `${entries.length} items` : `${entries.length} keys`
  preview.textContent = ` ${previewCount} `
  preview.style.display = collapsed ? 'inline' : 'none'
  wrap.appendChild(preview)

  const bracketCloseInline = document.createElement('span')
  bracketCloseInline.className = 'json-bracket'
  bracketCloseInline.textContent = closeBracket
  bracketCloseInline.style.display = collapsed ? 'inline' : 'none'
  wrap.appendChild(bracketCloseInline)

  const childrenBlock = document.createElement('span')
  childrenBlock.style.display = collapsed ? 'none' : 'block'

  entries.forEach(([key, val], i) => {
    const row = document.createElement('span')
    row.className = 'json-row'
    const comma = i < entries.length - 1 ? ',' : ''

    const keySpan = isArray ? '' : `<span class="json-key">"${escapeHtml(key)}"</span>: `
    const linePrefix = document.createElement('span')
    linePrefix.innerHTML = padInner + keySpan

    row.appendChild(linePrefix)
    row.appendChild(buildJsonTreeDOM(val, indent + 1))

    if (comma) {
      const commaSpan = document.createElement('span')
      commaSpan.className = 'json-bracket'
      commaSpan.textContent = comma
      row.appendChild(commaSpan)
    }

    row.appendChild(document.createTextNode('\n'))
    childrenBlock.appendChild(row)
  })

  wrap.appendChild(childrenBlock)

  const bracketCloseBlock = document.createElement('span')
  bracketCloseBlock.className = 'json-bracket'
  bracketCloseBlock.textContent = pad + closeBracket
  bracketCloseBlock.style.display = collapsed ? 'none' : 'inline'
  wrap.appendChild(bracketCloseBlock)

  toggle.addEventListener('click', (e) => {
    e.stopPropagation()
    collapsed = !collapsed
    toggle.classList.toggle('json-toggle--open', !collapsed)
    preview.style.display = collapsed ? 'inline' : 'none'
    bracketCloseInline.style.display = collapsed ? 'inline' : 'none'
    childrenBlock.style.display = collapsed ? 'none' : 'block'
    bracketCloseBlock.style.display = collapsed ? 'none' : 'inline'
  })

  return wrap
}

function computeDiff(
  before: unknown,
  after: unknown,
  path = ''
): { path: string; type: 'added' | 'removed' | 'changed'; oldVal?: unknown; newVal?: unknown }[] {
  const diffs: { path: string; type: 'added' | 'removed' | 'changed'; oldVal?: unknown; newVal?: unknown }[] = []

  if (before === after) return diffs

  if (
    typeof before !== 'object' || typeof after !== 'object' ||
    before === null || after === null ||
    Array.isArray(before) !== Array.isArray(after)
  ) {
    if (before === undefined) {
      diffs.push({ path: path || '(root)', type: 'added', newVal: after })
    } else if (after === undefined) {
      diffs.push({ path: path || '(root)', type: 'removed', oldVal: before })
    } else {
      diffs.push({ path: path || '(root)', type: 'changed', oldVal: before, newVal: after })
    }
    return diffs
  }

  const beforeObj = before as Record<string, unknown>
  const afterObj = after as Record<string, unknown>
  const allKeys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)])

  for (const key of allKeys) {
    const subPath = path ? `${path}.${key}` : key
    if (!(key in beforeObj)) {
      diffs.push({ path: subPath, type: 'added', newVal: afterObj[key] })
    } else if (!(key in afterObj)) {
      diffs.push({ path: subPath, type: 'removed', oldVal: beforeObj[key] })
    } else if (beforeObj[key] !== afterObj[key]) {
      if (typeof beforeObj[key] === 'object' && typeof afterObj[key] === 'object' && beforeObj[key] !== null && afterObj[key] !== null) {
        diffs.push(...computeDiff(beforeObj[key], afterObj[key], subPath))
      } else {
        diffs.push({ path: subPath, type: 'changed', oldVal: beforeObj[key], newVal: afterObj[key] })
      }
    }
  }

  return diffs
}

function renderDiffHtml(before: unknown, after: unknown): string {
  const diffs = computeDiff(before, after)
  if (diffs.length === 0) {
    return '<div class="diff-unchanged">— Без изменений —</div>'
  }

  return diffs.map(d => {
    const shortVal = (v: unknown) => {
      try { const s = JSON.stringify(v); return s.length > 100 ? s.slice(0, 100) + '…' : s }
      catch { return String(v) }
    }

    let html = `<div class="diff-section"><div class="diff-path">${escapeHtml(d.path)}</div>`
    if (d.type === 'added') {
      html += `<div class="diff-added">${escapeHtml(shortVal(d.newVal))}</div>`
    } else if (d.type === 'removed') {
      html += `<div class="diff-removed">${escapeHtml(shortVal(d.oldVal))}</div>`
    } else {
      html += `<div class="diff-removed">${escapeHtml(shortVal(d.oldVal))}</div>`
      html += `<div class="diff-added">${escapeHtml(shortVal(d.newVal))}</div>`
    }
    html += '</div>'
    return html
  }).join('')
}

export class DevToolsPanel {
  private container: HTMLElement
  private snapshots: StateSnapshot[] = []
  private selectedIndex = -1
  private activeTab: ActiveTab = 'action'
  private paused = false
  private locked = false
  private persistEnabled = false
  private sliderVisible = false
  private dispatcherVisible = false
  private jumpedIndex = -1
  private store: Store | null = null

  private actionsList!: HTMLElement
  private contentEl!: HTMLElement
  private statusCountEl!: HTMLElement
  private statusPosEl!: HTMLElement
  private statusTimeEl!: HTMLElement
  private tabEls!: NodeListOf<HTMLElement>
  private sliderContainer!: HTMLElement
  private sliderInput!: HTMLInputElement
  private sliderLabel!: HTMLElement
  private dispatcherEl!: HTMLElement
  private dispatcherTextarea!: HTMLTextAreaElement
  private playIntervalId: ReturnType<typeof setInterval> | null = null
  private styleInjected = false

  constructor(container: HTMLElement) {
    this.container = container
    this.injectStyles()
    this.render()
  }

  private injectStyles(): void {
    if (this.styleInjected) return
    if (document.getElementById('devtools-panel-css')) {
      this.styleInjected = true
      return
    }
    const style = document.createElement('style')
    style.id = 'devtools-panel-css'
    style.textContent = CSS
    document.head.appendChild(style)
    this.styleInjected = true
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="devtools">
        <div class="devtools__toolbar">
          <span class="devtools__toolbar-title">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="45" stroke="#764abc" stroke-width="6"/>
              <circle cx="50" cy="50" r="12" fill="#764abc"/>
            </svg>
            Redux DevTools
          </span>
          <div class="devtools__toolbar-actions">
            <button class="devtools__toolbar-btn" data-action="pause" title="Пауза записи">⏸ Pause</button>
            <button class="devtools__toolbar-btn" data-action="lock" title="Заблокировать dispatch">🔒 Lock</button>
            <button class="devtools__toolbar-btn" data-action="persist" title="Сохранять в localStorage">💾 Persist</button>
            <button class="devtools__toolbar-btn" data-action="slider" title="Показать/скрыть ползунок">⏩ Slider</button>
            <button class="devtools__toolbar-btn" data-action="dispatcher" title="Отправить кастомный экшен">📤 Dispatch</button>
            <button class="devtools__toolbar-btn" data-action="export" title="Экспортировать историю">↗ Export</button>
            <button class="devtools__toolbar-btn" data-action="import" title="Импортировать историю">↙ Import</button>
            <button class="devtools__toolbar-btn" data-action="clear" title="Очистить историю">🗑 Clear</button>
          </div>
        </div>
        <div class="devtools__main">
          <div class="devtools__actions-list">
            <div class="devtools__empty">Нет экшенов</div>
          </div>
          <div class="devtools__detail">
            <div class="devtools__tabs">
              <button class="devtools__tab devtools__tab--active" data-tab="action">Action</button>
              <button class="devtools__tab" data-tab="state">State</button>
              <button class="devtools__tab" data-tab="diff">Diff</button>
            </div>
            <div class="devtools__content">
              <div class="devtools__empty">Выберите экшен слева</div>
            </div>
          </div>
        </div>
        <div class="devtools__dispatcher">
          <textarea placeholder='{"type": "counter/incremented"}'></textarea>
          <button class="devtools__dispatcher-send">Dispatch</button>
        </div>
        <div class="devtools__slider-container">
          <span class="devtools__slider-label">0 / 0</span>
          <input type="range" class="devtools__slider" min="0" max="0" value="0">
          <button class="devtools__slider-play" title="Авто-воспроизведение">▶</button>
        </div>
        <div class="devtools__status">
          <span class="devtools__status-count">Экшенов: 0</span>
          <span class="devtools__status-pos"></span>
          <span class="devtools__status-time"></span>
        </div>
      </div>
    `

    this.actionsList = this.container.querySelector('.devtools__actions-list')!
    this.contentEl = this.container.querySelector('.devtools__content')!
    this.statusCountEl = this.container.querySelector('.devtools__status-count')!
    this.statusPosEl = this.container.querySelector('.devtools__status-pos')!
    this.statusTimeEl = this.container.querySelector('.devtools__status-time')!
    this.tabEls = this.container.querySelectorAll('.devtools__tab')
    this.sliderContainer = this.container.querySelector('.devtools__slider-container')!
    this.sliderInput = this.container.querySelector('.devtools__slider')!
    this.sliderLabel = this.container.querySelector('.devtools__slider-label')!
    this.dispatcherEl = this.container.querySelector('.devtools__dispatcher')!
    this.dispatcherTextarea = this.dispatcherEl.querySelector('textarea')!

    this.tabEls.forEach(tab => {
      tab.addEventListener('click', () => {
        this.activeTab = tab.dataset.tab as ActiveTab
        this.tabEls.forEach(t => t.classList.remove('devtools__tab--active'))
        tab.classList.add('devtools__tab--active')
        this.renderDetail()
      })
    })

    this.container.querySelector('[data-action="clear"]')!.addEventListener('click', () => this.clear())
    this.container.querySelector('[data-action="pause"]')!.addEventListener('click', (e) => this.togglePause(e.currentTarget as HTMLElement))
    this.container.querySelector('[data-action="lock"]')!.addEventListener('click', (e) => this.toggleLock(e.currentTarget as HTMLElement))
    this.container.querySelector('[data-action="persist"]')!.addEventListener('click', (e) => this.togglePersist(e.currentTarget as HTMLElement))
    this.container.querySelector('[data-action="slider"]')!.addEventListener('click', (e) => this.toggleSlider(e.currentTarget as HTMLElement))
    this.container.querySelector('[data-action="dispatcher"]')!.addEventListener('click', (e) => this.toggleDispatcher(e.currentTarget as HTMLElement))
    this.container.querySelector('[data-action="export"]')!.addEventListener('click', () => this.exportState())
    this.container.querySelector('[data-action="import"]')!.addEventListener('click', () => this.importState())

    this.dispatcherEl.querySelector('.devtools__dispatcher-send')!.addEventListener('click', () => this.dispatchCustomAction())

    this.sliderInput.addEventListener('input', () => {
      const idx = parseInt(this.sliderInput.value, 10)
      this.jumpToAction(idx)
    })

    this.container.querySelector('.devtools__slider-play')!.addEventListener('click', () => this.toggleAutoPlay())
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connectStore(store: Store<any, any>): void {
    this.store = store
    const originalDispatch = store.dispatch.bind(store)

    const initState = store.getState()
    this.addSnapshot({ type: '@@INIT' }, undefined, initState)

    if (this.persistEnabled) this.loadPersisted()

    store.dispatch = ((action: Action) => {
      if (this.locked) return action
      const stateBefore = store.getState()
      const result = originalDispatch(action)
      const stateAfter = store.getState()
      if (!this.paused) {
        this.addSnapshot(action, stateBefore, stateAfter)
      }
      return result
    }) as typeof store.dispatch
  }

  addSnapshot(action: Action & { [key: string]: unknown }, stateBefore: unknown, stateAfter: unknown): void {
    this.snapshots.push({
      action,
      stateBefore,
      stateAfter,
      timestamp: Date.now(),
      skipped: false,
    })
    this.renderActionsList()
    this.selectAction(this.snapshots.length - 1)
    this.updateStatus()
    this.updateSliderRange()
    if (this.persistEnabled) this.savePersisted()
  }

  private renderActionsList(): void {
    this.actionsList.innerHTML = this.snapshots.map((snap, i) => {
      const time = new Date(snap.timestamp)
      const timeStr = time.toLocaleTimeString('ru-RU', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
      const sel = i === this.selectedIndex ? ' devtools__action-item--selected' : ''
      const skipped = snap.skipped ? ' devtools__action-item--skipped' : ''
      const jumped = i === this.jumpedIndex ? ' devtools__action-item--jumped' : ''
      const typeStr = typeof snap.action.type === 'string' ? snap.action.type : String(snap.action.type)
      const skipTitle = snap.skipped ? 'Включить этот экшен' : 'Пропустить этот экшен'
      return `
        <div class="devtools__action-item${sel}${skipped}${jumped}" data-index="${i}">
          <span class="devtools__action-idx">#${i}</span>
          <span class="devtools__action-type" title="${escapeHtml(typeStr)}">${escapeHtml(typeStr)}</span>
          <span class="devtools__action-time">${timeStr}</span>
          <span class="devtools__action-btns">
            <button class="devtools__action-mini-btn ${snap.skipped ? 'devtools__action-mini-btn--skip-active' : ''}" data-skip="${i}" title="${skipTitle}">⊘</button>
            <button class="devtools__action-mini-btn" data-jump="${i}" title="Перейти к этому состоянию">⤓</button>
          </span>
        </div>
      `
    }).join('')

    this.actionsList.querySelectorAll('.devtools__action-item').forEach(el => {
      el.addEventListener('click', (e) => {
        const target = e.target as HTMLElement
        if (target.closest('[data-skip]') || target.closest('[data-jump]')) return
        const idx = parseInt((el as HTMLElement).dataset.index!, 10)
        this.selectAction(idx)
      })
    })

    this.actionsList.querySelectorAll('[data-skip]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const idx = parseInt((btn as HTMLElement).dataset.skip!, 10)
        this.toggleSkip(idx)
      })
    })

    this.actionsList.querySelectorAll('[data-jump]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const idx = parseInt((btn as HTMLElement).dataset.jump!, 10)
        this.jumpToAction(idx)
      })
    })

    this.actionsList.scrollTop = this.actionsList.scrollHeight
  }

  private selectAction(index: number): void {
    this.selectedIndex = index
    this.actionsList.querySelectorAll('.devtools__action-item').forEach((el, i) => {
      el.classList.toggle('devtools__action-item--selected', i === index)
    })
    this.renderDetail()
    this.updateStatus()
  }

  private renderDetail(): void {
    if (this.selectedIndex < 0 || this.selectedIndex >= this.snapshots.length) {
      this.contentEl.innerHTML = '<div class="devtools__empty">Выберите экшен слева</div>'
      return
    }

    const snap = this.snapshots[this.selectedIndex]
    this.contentEl.innerHTML = ''

    switch (this.activeTab) {
      case 'action': {
        const pre = document.createElement('pre')
        pre.className = 'json-tree'
        pre.appendChild(buildJsonTreeDOM(snap.action, 0))
        this.contentEl.appendChild(pre)
        break
      }
      case 'state': {
        const pre = document.createElement('pre')
        pre.className = 'json-tree'
        pre.appendChild(buildJsonTreeDOM(snap.stateAfter, 0))
        this.contentEl.appendChild(pre)
        break
      }
      case 'diff': {
        if (snap.stateBefore === undefined) {
          this.contentEl.innerHTML = `<div style="color:#4caf50; padding:8px; margin-bottom:8px; border-left:3px solid #4caf50; padding-left:12px;">@@INIT — начальное состояние установлено</div>`
          const pre = document.createElement('pre')
          pre.className = 'json-tree'
          pre.appendChild(buildJsonTreeDOM(snap.stateAfter, 0))
          this.contentEl.appendChild(pre)
        } else {
          this.contentEl.innerHTML = renderDiffHtml(snap.stateBefore, snap.stateAfter)
        }
        break
      }
    }
  }

  private updateStatus(): void {
    this.statusCountEl.textContent = `Экшенов: ${this.snapshots.length}`
    if (this.selectedIndex >= 0) {
      this.statusPosEl.textContent = `Позиция: ${this.selectedIndex + 1} / ${this.snapshots.length}`
    } else {
      this.statusPosEl.textContent = ''
    }
    if (this.snapshots.length > 0) {
      const last = this.snapshots[this.snapshots.length - 1]
      const t = new Date(last.timestamp)
      this.statusTimeEl.textContent = t.toLocaleTimeString('ru-RU', { hour12: false })
    }
  }

  private updateSliderRange(): void {
    const max = Math.max(0, this.snapshots.length - 1)
    this.sliderInput.max = String(max)
    if (this.selectedIndex >= 0) {
      this.sliderInput.value = String(this.selectedIndex)
    }
    this.sliderLabel.textContent = `${this.selectedIndex >= 0 ? this.selectedIndex : 0} / ${max}`
  }

  /* ── Toolbar actions ── */

  private togglePause(btn: HTMLElement): void {
    this.paused = !this.paused
    btn.classList.toggle('devtools__toolbar-btn--active', this.paused)
    btn.innerHTML = this.paused ? '▶ Resume' : '⏸ Pause'
  }

  private toggleLock(btn: HTMLElement): void {
    this.locked = !this.locked
    btn.classList.toggle('devtools__toolbar-btn--active', this.locked)
    btn.innerHTML = this.locked ? '🔓 Unlock' : '🔒 Lock'
  }

  private togglePersist(btn: HTMLElement): void {
    this.persistEnabled = !this.persistEnabled
    btn.classList.toggle('devtools__toolbar-btn--active', this.persistEnabled)
    if (this.persistEnabled) {
      this.savePersisted()
    } else {
      localStorage.removeItem(PERSIST_KEY)
    }
  }

  private toggleSlider(btn: HTMLElement): void {
    this.sliderVisible = !this.sliderVisible
    btn.classList.toggle('devtools__toolbar-btn--active', this.sliderVisible)
    this.sliderContainer.classList.toggle('devtools__slider-container--visible', this.sliderVisible)
    this.updateSliderRange()
  }

  private toggleDispatcher(btn: HTMLElement): void {
    this.dispatcherVisible = !this.dispatcherVisible
    btn.classList.toggle('devtools__toolbar-btn--active', this.dispatcherVisible)
    this.dispatcherEl.classList.toggle('devtools__dispatcher--visible', this.dispatcherVisible)
  }

  private dispatchCustomAction(): void {
    if (!this.store) return
    const text = this.dispatcherTextarea.value.trim()
    if (!text) return
    try {
      const action = JSON.parse(text)
      if (!action.type) {
        alert('Action должен содержать поле "type"')
        return
      }
      this.store.dispatch(action)
    } catch {
      alert('Невалидный JSON. Пример: {"type": "counter/incremented"}')
    }
  }

  private exportState(): void {
    const data = JSON.stringify({
      snapshots: this.snapshots,
      exportedAt: new Date().toISOString()
    }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `redux-devtools-export-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  private importState(): void {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.addEventListener('change', () => {
      const file = input.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string)
          if (parsed.snapshots && Array.isArray(parsed.snapshots)) {
            this.snapshots = parsed.snapshots
            this.renderActionsList()
            if (this.snapshots.length > 0) {
              this.selectAction(this.snapshots.length - 1)
            }
            this.updateStatus()
            this.updateSliderRange()
          } else {
            alert('Неверный формат файла экспорта')
          }
        } catch {
          alert('Ошибка чтения JSON файла')
        }
      }
      reader.readAsText(file)
    })
    input.click()
  }

  /* ── Skip / Jump ── */

  private toggleSkip(index: number): void {
    if (index === 0) return
    this.snapshots[index].skipped = !this.snapshots[index].skipped
    this.recomputeStatesAfterSkip()
    this.renderActionsList()
    this.renderDetail()
  }

  private recomputeStatesAfterSkip(): void {
    if (!this.store || this.snapshots.length === 0) return
    const initSnap = this.snapshots[0]
    let currentState = initSnap.stateAfter

    for (let i = 1; i < this.snapshots.length; i++) {
      const snap = this.snapshots[i]
      if (snap.skipped) {
        snap.stateAfter = currentState
      } else {
        currentState = snap.stateAfter
      }
    }
  }

  private jumpToAction(index: number): void {
    if (index < 0 || index >= this.snapshots.length || !this.store) return
    this.jumpedIndex = index
    const targetState = this.snapshots[index].stateAfter

    const replaceState = (this.store as unknown as { replaceReducer: unknown; dispatch: unknown; getState: () => unknown })

    try {
      const currentReducer = this.extractReducer()
      if (currentReducer) {
        (this.store as unknown as { $$replaceState?: (s: unknown) => void }).$$replaceState?.(targetState)
      }
    } catch { /* no-op */ }

    this.selectAction(index)
    this.sliderInput.value = String(index)
    this.sliderLabel.textContent = `${index} / ${Math.max(0, this.snapshots.length - 1)}`
    this.renderActionsList()
    void replaceState
  }

  private extractReducer(): boolean {
    return !!this.store
  }

  /* ── Auto-play ── */

  private toggleAutoPlay(): void {
    const btn = this.container.querySelector('.devtools__slider-play')!
    if (this.playIntervalId !== null) {
      clearInterval(this.playIntervalId)
      this.playIntervalId = null
      btn.textContent = '▶'
      return
    }

    btn.textContent = '⏸'
    let current = 0
    this.playIntervalId = setInterval(() => {
      if (current >= this.snapshots.length) {
        clearInterval(this.playIntervalId!)
        this.playIntervalId = null
        btn.textContent = '▶'
        return
      }
      this.selectAction(current)
      this.sliderInput.value = String(current)
      this.sliderLabel.textContent = `${current} / ${Math.max(0, this.snapshots.length - 1)}`
      current++
    }, 500)
  }

  /* ── Persist ── */

  private savePersisted(): void {
    try {
      localStorage.setItem(PERSIST_KEY, JSON.stringify(this.snapshots))
    } catch { /* quota exceeded */ }
  }

  private loadPersisted(): void {
    try {
      const raw = localStorage.getItem(PERSIST_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.snapshots = parsed
          this.renderActionsList()
          this.selectAction(this.snapshots.length - 1)
          this.updateStatus()
          this.updateSliderRange()
        }
      }
    } catch { /* parse error */ }
  }

  /* ── Clear ── */

  clear(): void {
    this.snapshots = []
    this.selectedIndex = -1
    this.jumpedIndex = -1
    this.actionsList.innerHTML = '<div class="devtools__empty">Нет экшенов</div>'
    this.contentEl.innerHTML = '<div class="devtools__empty">Выберите экшен слева</div>'
    this.updateStatus()
    this.updateSliderRange()
    if (this.persistEnabled) localStorage.removeItem(PERSIST_KEY)
  }
}
