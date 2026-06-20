const noteTextarea = document.getElementById('note');
const deleteButton = document.getElementById('delete-note');
const STORAGE_KEY = 'tabNotes.note';

function saveNote(note) {
    chrome.storage.local.set({ [STORAGE_KEY]: note });
}

function loadNote() {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
        if (result && typeof result[STORAGE_KEY] === 'string') {
            noteTextarea.value = result[STORAGE_KEY];
        } else {
            noteTextarea.value = '';
        }
    });
}

function deleteNote() {
    chrome.storage.local.remove([STORAGE_KEY], () => {
        noteTextarea.value = '';
    });
}

noteTextarea.addEventListener('input', () => {
    saveNote(noteTextarea.value);
});

deleteButton.addEventListener('click', () => {
    deleteNote();
});

document.addEventListener('DOMContentLoaded', loadNote);
