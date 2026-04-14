import { legacy_createStore as createStore } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'
import { ConsolePanel } from '../shared/console-panel'

interface Note {
  id: number
  text: string
}

type NotesState = Note[]

interface NotePayload {
  id: number
  text: string
}

interface NoteAction {
  type: string
  payload: NotePayload
}

const initialState: NotesState = []

let nextNoteId = 1

function noteAdded(text: string): NoteAction {
  const id = nextNoteId++
  return {
    type: 'notes/noteAdded',
    payload: { id, text }
  }
}

function notesReducer(
  state: NotesState = initialState,
  action: NoteAction
): NotesState {
  switch (action.type) {
    case 'notes/noteAdded':
      return [...state, {
        id: action.payload.id,
        text: action.payload.text
      }]
    default:
      return state
  }
}

const store = createStore(notesReducer)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const con = new ConsolePanel(document.getElementById('console-container')!, 'Action Creator Log')

function render(): void {
  const state = store.getState()
  document.getElementById('state-display')!.textContent = JSON.stringify(state, null, 2)

  const listEl = document.getElementById('notes-list')!
  if (state.length === 0) {
    listEl.textContent = 'Пока пусто'
  } else {
    listEl.innerHTML = state.map((note: Note) =>
      `<div style="padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
        <span style="color: var(--accent-cyan);">#${note.id}</span> — ${note.text}
      </div>`
    ).join('')
  }
}

function showAction(action: NoteAction): void {
  document.getElementById('action-display')!.textContent = JSON.stringify(action, null, 2)
}

store.subscribe(render)
render()

con.info('ID генерируется в action creator, а не в reducer!')
con.info('Это сохраняет чистоту reducer\'а')

document.getElementById('btn-add')!.addEventListener('click', (): void => {
  const input = document.getElementById('note-input') as HTMLInputElement
  const text = input.value.trim()
  if (!text) return

  const action = noteAdded(text)
  showAction(action)

  con.success(`noteAdded("${text}") → ID = ${action.payload.id}`)
  con.log(`Action: ${JSON.stringify(action)}`)

  store.dispatch(action)
  input.value = ''
  input.focus()
})

const noteInput = document.getElementById('note-input') as HTMLInputElement
noteInput.addEventListener('keydown', (e: KeyboardEvent): void => {
  if (e.key === 'Enter') {
    document.getElementById('btn-add')!.click()
  }
})
