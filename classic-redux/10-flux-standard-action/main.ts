import { ConsolePanel } from '../shared/console-panel'

interface FSA {
  type: string
  payload?: unknown
  meta?: unknown
  error?: boolean
}

const consolePanel = new ConsolePanel(
  document.getElementById('console-container')!,
  'FSA Validation Console'
)

const typeInput = document.getElementById('fsa-type') as HTMLInputElement
const payloadInput = document.getElementById('fsa-payload') as HTMLInputElement
const metaInput = document.getElementById('fsa-meta') as HTMLInputElement
const previewEl = document.getElementById('fsa-preview')!
const validationEl = document.getElementById('fsa-validation')!

function getErrorValue(): 'none' | 'true' | 'false' {
  const checked = document.querySelector('input[name="fsa-error"]:checked') as HTMLInputElement
  return (checked?.value ?? 'none') as 'none' | 'true' | 'false'
}

function tryParseJSON(str: string): unknown {
  const trimmed = str.trim()
  if (!trimmed) return undefined
  try {
    return JSON.parse(trimmed)
  } catch {
    return trimmed
  }
}

function buildFSA(): FSA {
  const fsa: FSA = {
    type: typeInput.value.trim() || ''
  }

  const payloadVal = tryParseJSON(payloadInput.value)
  if (payloadVal !== undefined) {
    fsa.payload = payloadVal
  }

  const metaVal = tryParseJSON(metaInput.value)
  if (metaVal !== undefined) {
    fsa.meta = metaVal
  }

  const errorVal = getErrorValue()
  if (errorVal === 'true') {
    fsa.error = true
  } else if (errorVal === 'false') {
    fsa.error = false
  }

  return fsa
}

function updatePreview(): void {
  const fsa = buildFSA()
  previewEl.textContent = JSON.stringify(fsa, null, 2)
}

function validateFSA(fsa: FSA): { valid: boolean; messages: string[] } {
  const messages: string[] = []
  let valid = true

  if (typeof fsa.type !== 'string' || fsa.type === '') {
    messages.push('✖ type обязателен и должен быть непустой строкой')
    valid = false
  } else {
    messages.push('✔ type — корректная строка')
  }

  if ('error' in fsa && typeof fsa.error !== 'boolean') {
    messages.push('✖ error должен быть boolean (true/false)')
    valid = false
  } else if ('error' in fsa) {
    messages.push(`✔ error — boolean (${fsa.error})`)
  }

  if (fsa.error === true && fsa.payload !== undefined) {
    if (!(fsa.payload instanceof Error) && typeof fsa.payload !== 'string') {
      messages.push('⚠ При error: true, payload по спецификации должен быть объектом Error')
    }
  }

  const allowedKeys = new Set(['type', 'payload', 'error', 'meta'])
  const extraKeys = Object.keys(fsa).filter(k => !allowedKeys.has(k))
  if (extraKeys.length > 0) {
    messages.push(`✖ Лишние поля: ${extraKeys.join(', ')}. FSA допускает только type, payload, error, meta`)
    valid = false
  } else {
    messages.push('✔ Нет лишних полей')
  }

  if (fsa.type.includes('/')) {
    messages.push('✔ type использует формат domain/eventName')
  } else if (fsa.type) {
    messages.push('⚠ type не содержит «/» — рекомендуется формат domain/eventName')
  }

  return { valid, messages }
}

function displayValidation(fsa: FSA): void {
  const result = validateFSA(fsa)
  const color = result.valid ? 'var(--success)' : 'var(--error)'
  const header = result.valid ? '✔ FSA ВАЛИДЕН' : '✖ FSA НЕ ВАЛИДЕН'

  validationEl.style.color = color
  validationEl.textContent = `${header}\n\n${result.messages.join('\n')}`

  if (result.valid) {
    consolePanel.success(`FSA валиден: ${JSON.stringify(fsa)}`)
  } else {
    consolePanel.error(`FSA невалиден: ${result.messages.filter(m => m.startsWith('✖')).join('; ')}`)
  }

  result.messages.forEach(msg => {
    if (msg.startsWith('✔')) consolePanel.success(msg)
    else if (msg.startsWith('✖')) consolePanel.error(msg)
    else if (msg.startsWith('⚠')) consolePanel.warn(msg)
  })
}

typeInput.addEventListener('input', updatePreview)
payloadInput.addEventListener('input', updatePreview)
metaInput.addEventListener('input', updatePreview)
document.querySelectorAll('input[name="fsa-error"]').forEach(radio => {
  radio.addEventListener('change', updatePreview)
})

updatePreview()

document.getElementById('btn-validate')!.addEventListener('click', (): void => {
  const fsa = buildFSA()
  displayValidation(fsa)
  consolePanel.log('---')
})

document.getElementById('btn-success')!.addEventListener('click', (): void => {
  typeInput.value = 'users/fetchCompleted'
  payloadInput.value = '{"id": 1, "name": "Анна"}'
  metaInput.value = ''
  const noneRadio = document.querySelector('input[name="fsa-error"][value="none"]') as HTMLInputElement
  noneRadio.checked = true
  updatePreview()

  const fsa = buildFSA()
  consolePanel.success('Создан success action:')
  consolePanel.log(JSON.stringify(fsa, null, 2))
  displayValidation(fsa)
})

document.getElementById('btn-error')!.addEventListener('click', (): void => {
  typeInput.value = 'users/fetchCompleted'
  payloadInput.value = 'Сервер недоступен'
  metaInput.value = '{"retryCount": 3}'
  const trueRadio = document.querySelector('input[name="fsa-error"][value="true"]') as HTMLInputElement
  trueRadio.checked = true
  updatePreview()

  const fsa = buildFSA()
  consolePanel.error('Создан error action:')
  consolePanel.log(JSON.stringify(fsa, null, 2))
  displayValidation(fsa)
})
