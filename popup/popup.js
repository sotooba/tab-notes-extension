const STORAGE_KEY = 'tabNotes.notes';

const addButton = document.getElementById('add-note');
const deleteAllButton = document.getElementById('delete-all');
const notesListEl = document.getElementById('notes-list');

let notes = [];
const saveTimers = new Map();

function saveNotes() {
    chrome.storage.local.set({ [STORAGE_KEY]: notes });
}

function loadNotes() {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
        if (result && Array.isArray(result[STORAGE_KEY])) {
            notes = result[STORAGE_KEY];
        } else {
            notes = [];
        }
        renderNotes();
    });
}

function createNoteElement(note) {
    const container = document.createElement('div');
    container.className = 'note';

    const textarea = document.createElement('textarea');
    textarea.className = 'note-textarea';
    textarea.value = note.content || '';
    textarea.placeholder = 'Write a note...';
    textarea.setAttribute('data-id', note.id);

    const delBtn = document.createElement('button');
    delBtn.className = 'note-delete icon-btn';
    delBtn.setAttribute('title', 'Delete note');
    delBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M3 6h18M8 6v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6M10 6V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;

    container.appendChild(textarea);
    container.appendChild(delBtn);

    textarea.addEventListener('input', () => {
        note.content = textarea.value;
        autoResize(textarea);

        if (saveTimers.has(note.id)) clearTimeout(saveTimers.get(note.id));
        const t = setTimeout(() => {
            saveNotes();
            saveTimers.delete(note.id);
        }, 700);
        saveTimers.set(note.id, t);
    });

    textarea.addEventListener('blur', () => {
        if (saveTimers.has(note.id)) {
            clearTimeout(saveTimers.get(note.id));
            saveTimers.delete(note.id);
        }
        saveNotes();
        autoShrinkToContent(textarea);
    });

    delBtn.addEventListener('click', () => {
        deleteNote(note.id);
    });

    return container;
}

function renderNotes() {
    notesListEl.innerHTML = '';
    notes.forEach((note) => {
        const el = createNoteElement(note);
        notesListEl.appendChild(el);
        const ta = el.querySelector('textarea');
        if (ta && ta.value && ta.value.trim() !== '') autoResize(ta);
    });
}

function addNote() {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const note = { id, content: '', createdAt: Date.now() };
    
    // insert new note at the start of the data and DOM without re-rendering existing notes
    notes.unshift(note);
    saveNotes();

    const el = createNoteElement(note);
    notesListEl.prepend(el);
    const textarea = el.querySelector(`textarea[data-id="${id}"]`);
    if (textarea) {
        
        // new notes are empty so width is full;
        autoResize(textarea);
        textarea.focus();
    }
}

function deleteNote(id) {
    notes = notes.filter((n) => n.id !== id);
    saveNotes();

    // remove the DOM element for the deleted note only
    const textarea = notesListEl.querySelector(`textarea[data-id="${id}"]`);
    if (textarea && textarea.parentElement) textarea.parentElement.remove();
}

function deleteAll() {
    notes = [];
    saveNotes();
    notesListEl.innerHTML = '';
}

function autoResize(textarea) {
    // height: fit content
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';

    // width: only adjust when there is content; empty textareas keep full width
    if (!textarea.value || textarea.value.trim() === '') {
        textarea.style.width = '100%';
        return;
    }

    textarea.style.width = 'auto';
    const padding = 24; 
    const maxWidth = Math.max(document.body.clientWidth - padding, 120);
    const newWidth = Math.min(textarea.scrollWidth + 2, maxWidth);
    textarea.style.width = newWidth + 'px';
}

function autoShrinkToContent(textarea) {
    autoResize(textarea);
}

addButton.addEventListener('click', addNote);
deleteAllButton.addEventListener('click', deleteAll);

document.addEventListener('DOMContentLoaded', loadNotes);
