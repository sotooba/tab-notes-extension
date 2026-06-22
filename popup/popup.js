const STORAGE_KEY = 'tabNotes.notes';
const THEME_KEY = 'tabNotes.theme';

const addButton = document.getElementById('add-note');
const deleteAllButton = document.getElementById('delete-all');
const themeToggle = document.getElementById('theme-toggle');
const notesListEl = document.getElementById('notes-list');
const noteCounterEl = document.getElementById('noteCounter');

let notes = [];
const saveTimers = new Map();
let currentDragId = null;
let currentDragOverEl = null;


// Load saved theme from localStorage and apply it on popup open
function loadTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'light';

    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.textContent = '☀️';
    } else {
        document.body.classList.remove('dark-mode');
        themeToggle.textContent = '🌙';
    }
}

// Toggle between light and dark themes,
function toggleTheme() {
    const isDarkMode = document.body.classList.contains('dark-mode');

    if (isDarkMode) {
        document.body.classList.remove('dark-mode');
        localStorage.setItem(THEME_KEY, 'light');
        themeToggle.textContent = '🌙';
    } else {
        document.body.classList.add('dark-mode');
        localStorage.setItem(THEME_KEY, 'dark');
        themeToggle.textContent = '☀️';
    }
}


// Save notes to chrome.storage.local whenever they are added, edited, or deleted
function saveNotes() {
    // Persist only permanent (saved) notes
    const toSave = notes.filter(n => !n.isTemporary);
    chrome.storage.local.set({ [STORAGE_KEY]: toSave });
}


// Update the visible note counter (counts only saved notes)
function updateNoteCounter() {
    if (!noteCounterEl) return;
    const count = notes.filter(n => !n.isTemporary).length;
    noteCounterEl.textContent = `(${count})`;
}


function sortNotes() {
    notes = notes
        .map((note, idx) => ({ note, idx }))
        .sort((a, b) => {
            if (a.note.pinned !== b.note.pinned) {
                return a.note.pinned ? -1 : 1;
            }
            return a.idx - b.idx;
        })
        .map((item) => item.note);
}

function loadNotes() {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
        if (result && Array.isArray(result[STORAGE_KEY])) {
            notes = result[STORAGE_KEY].map((note) => ({
                ...note,
                pinned: Boolean(note.pinned),
                isTemporary: Boolean(note.isTemporary),
            }));
        }
        else {
            notes = [];
        }

        sortNotes();
        renderNotes();
        updateNoteCounter();
    });
}

// Attach drag handlers to a permanent note container
function enableDrag(container, note) {
    container.draggable = true;

    container.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', note.id);
        e.dataTransfer.effectAllowed = 'move';
        container.classList.add('dragging');
        currentDragId = note.id;
    });

    container.addEventListener('dragend', () => {
        container.classList.remove('dragging');
        currentDragId = null;

        if (currentDragOverEl) {
            currentDragOverEl.classList.remove('drag-over-before', 'drag-over-after');
            currentDragOverEl = null;
        }
    });
}

function togglePin(id) {
    const index = notes.findIndex((note) => note.id === id);
    if (index === -1) return;

    const note = notes[index];
    note.pinned = !note.pinned;

    notes.splice(index, 1);
    if (note.pinned) {
        const lastPinnedIndex = notes.reduce((last, current, idx) => current.pinned ? idx : last, -1);
        notes.splice(lastPinnedIndex + 1, 0, note);
    } else {
        const firstUnpinnedIndex = notes.findIndex((current) => !current.pinned);
        const insertIndex = firstUnpinnedIndex === -1 ? notes.length : firstUnpinnedIndex;
        notes.splice(insertIndex, 0, note);
    }

    saveNotes();
    renderNotes();
    updateNoteCounter();
}


// Create a DOM element for a single note, including textarea and delete button
function createNoteElement(note) {
    const container = document.createElement('div');
    container.className = 'note';
    container.setAttribute('data-id', note.id);

    if (note.isTemporary) {
        container.classList.add('temp-note');
    } else if (note.pinned) {
        container.classList.add('pinned');
    } else {
        enableDrag(container, note);
    }

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

    if (!note.isTemporary) {
        const pinBtn = document.createElement('button');
        pinBtn.className = 'note-pin icon-btn';
        pinBtn.type = 'button';
        pinBtn.title = note.pinned ? 'Unpin note' : 'Pin note';
        pinBtn.textContent = note.pinned ? '📌' : '📍';

        pinBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            togglePin(note.id);
        });

        container.appendChild(pinBtn);
    }

    container.appendChild(delBtn);

    textarea.addEventListener('input', () => {
        note.content = textarea.value;
        autoResize(textarea);

        // If temporary note now has content, convert it to permanent
        if (note.isTemporary && textarea.value.trim() !== '') {
            note.isTemporary = false;
            container.classList.remove('temp-note');

            // enable dragging now that the note is permanent
            if (!note.pinned) enableDrag(container, note);

            updateNoteCounter();

            if (saveTimers.has(note.id)) clearTimeout(saveTimers.get(note.id));
            const t = setTimeout(() => {
                saveNotes();
                saveTimers.delete(note.id);
            }, 700);

            saveTimers.set(note.id, t);

        }
        else if (!note.isTemporary) {
            // Normal save behavior for existing notes
            if (saveTimers.has(note.id)) clearTimeout(saveTimers.get(note.id));
            const t = setTimeout(() => {
                saveNotes();
                saveTimers.delete(note.id);
            }, 700);

            saveTimers.set(note.id, t);
        }
    });

    textarea.addEventListener('blur', () => {
        if (saveTimers.has(note.id)) {
            clearTimeout(saveTimers.get(note.id));
            saveTimers.delete(note.id);
        }

        // If note is empty after blur, delete it from DOM and storage
        if (textarea.value.trim() === '') {
            deleteNote(note.id);
            return;
        }

        // Otherwise, save if not temporary
        if (!note.isTemporary) {
            saveNotes();
        }
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
        if (ta) autoResize(ta);
    });
}


// Move dragged note in the notes array before/after the targetId, then persist
function moveDraggedNote(draggedId, targetId, before = true) {
    // Reorder only permanent notes; keep temporary notes in their original positions
    const savedNotes = notes.filter(n => !n.isTemporary).slice();
    const draggedSavedIndex = savedNotes.findIndex(n => n.id === draggedId);

    if (draggedSavedIndex === -1) return;
    const [draggedSaved] = savedNotes.splice(draggedSavedIndex, 1);

    const targetSavedIndex = savedNotes.findIndex(n => n.id === targetId);
    let insertSavedIndex = targetSavedIndex;

    if (!before) insertSavedIndex = targetSavedIndex + 1;

    if (targetSavedIndex === -1) {
        savedNotes.push(draggedSaved);
    } else {
        if (insertSavedIndex > savedNotes.length) insertSavedIndex = savedNotes.length;
        savedNotes.splice(insertSavedIndex, 0, draggedSaved);
    }

    // Rebuild notes array: keep temp notes at their positions, fill permanent slots from savedNotes
    const newNotes = [];
    let savedIter = 0;
    for (const n of notes) {
        if (n.isTemporary) {
            newNotes.push(n);
        } else {
            newNotes.push(savedNotes[savedIter++]);
        }
    }
    // If there were no temporary notes and lengths differ, ensure remaining saved ones are appended
    while (savedIter < savedNotes.length) {
        newNotes.push(savedNotes[savedIter++]);
    }

    notes = newNotes;
    saveNotes();
    renderNotes();
    updateNoteCounter();
}


function moveDraggedNoteToEnd(draggedId) {
    const savedNotes = notes.filter(n => !n.isTemporary).slice();
    const draggedSavedIndex = savedNotes.findIndex(n => n.id === draggedId);

    if (draggedSavedIndex === -1) return;
    const [draggedSaved] = savedNotes.splice(draggedSavedIndex, 1);

    savedNotes.push(draggedSaved);

    // rebuild notes array keeping temp notes in place
    const newNotes = [];
    let savedIter = 0;
    for (const n of notes) {
        if (n.isTemporary) newNotes.push(n);
        else newNotes.push(savedNotes[savedIter++]);
    }
    while (savedIter < savedNotes.length) newNotes.push(savedNotes[savedIter++]);

    notes = newNotes;
    saveNotes();
    renderNotes();
    updateNoteCounter();
}


// List-level drag handlers
notesListEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    const target = e.target.closest('.note:not(.pinned):not(.temp-note)');
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;

    if (currentDragOverEl && currentDragOverEl !== target) {
        currentDragOverEl.classList.remove('drag-over-before', 'drag-over-after');
    }

    currentDragOverEl = target;
    target.classList.add(before ? 'drag-over-before' : 'drag-over-after');
});


notesListEl.addEventListener('dragleave', (e) => {
    const related = e.relatedTarget;
    // if leaving the list entirely, clear any highlights
    if (!related || !notesListEl.contains(related)) {
        if (currentDragOverEl) {
            currentDragOverEl.classList.remove('drag-over-before', 'drag-over-after');
            currentDragOverEl = null;
        }
    }
});


notesListEl.addEventListener('drop', (e) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId) return;

    const target = e.target.closest('.note:not(.pinned):not(.temp-note)');
    if (!target) {
        moveDraggedNoteToEnd(draggedId);
    } else {
        const rect = target.getBoundingClientRect();
        const before = e.clientY < rect.top + rect.height / 2;
        const targetId = target.getAttribute('data-id') || target.querySelector('textarea')?.getAttribute('data-id');
        if (targetId) moveDraggedNote(draggedId, targetId, before);
    }

    if (currentDragOverEl) {
        currentDragOverEl.classList.remove('drag-over-before', 'drag-over-after');
        currentDragOverEl = null;
    }
});


function addNote() {
    // Check if temporary note already exists
    const existingTempNote = notesListEl.querySelector('.temp-note');

    if (existingTempNote) {
        const textarea = existingTempNote.querySelector('textarea');
        if (textarea) textarea.focus();
        return;
    }

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const note = { id, content: '', createdAt: Date.now(), isTemporary: true, pinned: false };
    // insert new temporary note at the start without saving to storage
    notes.unshift(note);

    const el = createNoteElement(note);
    notesListEl.prepend(el);
    const textarea = el.querySelector(`textarea[data-id="${id}"]`);

    if (textarea) {
        autoResize(textarea);
        textarea.focus();
    }
}


function deleteNote(id) {
    // find the note before removing to check if it's temporary
    const noteToDelete = notes.find((n) => n.id === id);
    const isTemporary = noteToDelete && noteToDelete.isTemporary;

    // remove note from array
    notes = notes.filter((n) => n.id !== id);

    // remove the DOM element for the deleted note only
    const textarea = notesListEl.querySelector(`textarea[data-id="${id}"]`);

    if (textarea && textarea.parentElement) textarea.parentElement.remove();

    // only save to storage if we removed a permanent note
    if (!isTemporary) {
        saveNotes();
    }
    updateNoteCounter();
}


function deleteAll() {
    notes = [];
    saveNotes();
    notesListEl.innerHTML = '';
    updateNoteCounter();
}


function autoResize(textarea) {
    // height: fit content
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';

    // keep textarea full width inside its card container
    textarea.style.width = '100%';
}


function autoShrinkToContent(textarea) {
    autoResize(textarea);
}


addButton.addEventListener('click', addNote);
deleteAllButton.addEventListener('click', deleteAll);
themeToggle.addEventListener('click', toggleTheme);


document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    loadNotes();
});
