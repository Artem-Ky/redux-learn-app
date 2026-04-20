export type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'success' | 'action'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: number
}

const LEVEL_ICONS: Record<LogLevel, string> = {
  log: '›',
  info: 'ℹ',
  warn: '⚠',
  error: '✖',
  success: '✔',
  action: '→',
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  log: '#ccc',
  info: '#569cd6',
  warn: '#ff9800',
  error: '#f44747',
  success: '#4caf50',
  action: '#c586c0',
}

const CSS = `
.console-panel {
  background: #0d0d0d;
  border: 1px solid #333;
  border-radius: 6px;
  overflow: hidden;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 0.82rem;
  display: flex;
  flex-direction: column;
}
.console-panel__header {
  background: #1b1b1b;
  border-bottom: 1px solid #333;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  user-select: none;
}
.console-panel__title {
  color: #999;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.console-panel__title::before {
  content: '>';
  color: #569cd6;
}
.console-panel__clear {
  background: none;
  border: 1px solid #444;
  color: #999;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 0.7rem;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, color 0.15s;
}
.console-panel__clear:hover {
  background: #2a2d2e;
  color: #ccc;
}
.console-panel__body {
  padding: 8px 0;
  overflow-y: auto;
  min-height: 100px;
  max-height: 400px;
}
.console-panel__entry {
  padding: 3px 12px;
  display: flex;
  gap: 8px;
  align-items: flex-start;
  border-bottom: 1px solid rgba(255,255,255,0.03);
  line-height: 1.5;
}
.console-panel__entry:hover {
  background: rgba(255,255,255,0.02);
}
.console-panel__icon {
  flex-shrink: 0;
  width: 14px;
  text-align: center;
}
.console-panel__msg {
  white-space: pre-wrap;
  word-break: break-all;
}
.console-panel__time {
  color: #555;
  font-size: 0.7rem;
  margin-left: auto;
  flex-shrink: 0;
}
.console-panel__empty {
  color: #555;
  padding: 20px;
  text-align: center;
  font-style: italic;
}
`

export class ConsolePanel {
  private container: HTMLElement
  private body!: HTMLElement
  private entries: LogEntry[] = []
  private styleInjected = false

  constructor(container: HTMLElement, title = 'Console') {
    this.container = container
    this.injectStyles()
    this.render(title)
  }

  private injectStyles(): void {
    if (this.styleInjected) return
    if (document.getElementById('console-panel-css')) {
      this.styleInjected = true
      return
    }
    const style = document.createElement('style')
    style.id = 'console-panel-css'
    style.textContent = CSS
    document.head.appendChild(style)
    this.styleInjected = true
  }

  private render(title: string): void {
    this.container.innerHTML = `
      <div class="console-panel">
        <div class="console-panel__header">
          <span class="console-panel__title">${title}</span>
          <button class="console-panel__clear">Clear</button>
        </div>
        <div class="console-panel__body">
          <div class="console-panel__empty">Ожидание вывода...</div>
        </div>
      </div>
    `
    this.body = this.container.querySelector('.console-panel__body')!
    this.container.querySelector('.console-panel__clear')!.addEventListener('click', () => this.clear())
  }

  private addEntry(level: LogLevel, ...args: unknown[]): void {
    const message = args.map(a => {
      if (typeof a === 'string') return a
      try { return JSON.stringify(a, null, 2) }
      catch { return String(a) }
    }).join(' ')

    const entry: LogEntry = { level, message, timestamp: Date.now() }
    this.entries.push(entry)

    const empty = this.body.querySelector('.console-panel__empty')
    if (empty) empty.remove()

    const el = document.createElement('div')
    el.className = 'console-panel__entry'

    const time = new Date(entry.timestamp)
    const timeStr = time.toLocaleTimeString('ru-RU', { hour12: false })

    el.innerHTML = `
      <span class="console-panel__icon" style="color:${LEVEL_COLORS[level]}">${LEVEL_ICONS[level]}</span>
      <span class="console-panel__msg" style="color:${LEVEL_COLORS[level]}">${this.escapeHtml(message)}</span>
      <span class="console-panel__time">${timeStr}</span>
    `
    this.body.appendChild(el)
    this.body.scrollTop = this.body.scrollHeight
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }

  log(...args: unknown[]): void { this.addEntry('log', ...args) }
  info(...args: unknown[]): void { this.addEntry('info', ...args) }
  warn(...args: unknown[]): void { this.addEntry('warn', ...args) }
  error(...args: unknown[]): void { this.addEntry('error', ...args) }
  success(...args: unknown[]): void { this.addEntry('success', ...args) }
  action(action: { type: string; payload?: unknown }, label?: string): void {
    const prefix = label ? `[${label}] ` : ''
    this.addEntry('action', `${prefix}dispatch → ${action.type}`, action.payload !== undefined ? action.payload : '')
  }

  clear(): void {
    this.entries = []
    this.body.innerHTML = '<div class="console-panel__empty">Консоль очищена</div>'
  }
}
