# Tab Notes

A lightweight Chromium-based browser extension for quick, persistent notes scoped to your browser. Notes live in a compact popup, autosave as you type, and persist between browser sessions.

**Version: 1.1**

## Highlights

- **Multi-note support**: create and manage many notes in the popup
- **Autosave**: edits persist automatically with a brief debounce
- **Temporary notes**: new notes start as temporary and are not persisted or counted until content is added
- **Pinning**: pin important notes to keep them at the top of the list
- **Drag & drop**: reorder permanent notes (dragging ignores pinned notes)
- **Note counter**: header counter shows number of saved (non-temporary) notes
- **Delete individual / Delete all**: remove single notes or clear all (delete-all asks for confirmation)
- **Dark mode**: toggle a compact dark theme; the theme preference is stored locally
- **Empty-state UI**: helpful placeholder when there are no notes yet

## New / Notable behavior

- New notes are inserted directly below any pinned notes so your pinned section stays at the top.
- Pinned notes are excluded from drag-and-drop reordering to avoid accidental moves.
- If a temporary note is left empty (for example you blur the textarea without entering text), it will be removed automatically.
- Notes are stored persistently using the browser storage API; theme preference is stored in `localStorage`.

## Data model

Notes are stored with a small JSON shape, for example:

```json
{
  "id": "<uuid>",
  "content": "...",
  "createdAt": 1680000000000,
  "isTemporary": false,
  "pinned": false
}
```

## Usage

- **Add a note**: click the **+** icon in the header to create a new note (it starts as temporary until you type).
- **Edit a note**: type directly into a note card; changes autosave after a short debounce.
- **Pin/unpin**: click the pin icon on a note to toggle pinning; pinned notes stay at the top.
- **Reorder notes**: drag permanent (non-pinned) notes to reorder them; ordering persists.
- **Delete a note**: click the delete/trash icon on a note card to remove it.
- **Delete all**: click the delete-all button in the header — you'll be asked to confirm.
- **Toggle theme**: use the theme button in the header to switch dark/light; the choice persists.

## Storage keys

- Notes are persisted via the extension storage layer (see [popup/popup.js](popup/popup.js)) under the `tabNotes.notes` key.
- Theme preference is saved in `localStorage` under `tabNotes.theme` (see [popup/popup.js](popup/popup.js)).

## Installation

1. Clone or download this repository:

```bash
git clone https://github.com/sotooba/tab-notes-extension.git
cd tab-notes-extension
```

2. Open your Chromium-based browser's Extensions page (e.g. `chrome://extensions`).
3. Enable **Developer mode** and click **Load unpacked**.
4. Select the `tab-notes-extension` folder.

The extension icon should appear in the toolbar, click it to open the popup.

## Files of interest

- Popup UI and behavior: [popup/popup.html](popup/popup.html), [popup/popup.css](popup/popup.css), [popup/popup.js](popup/popup.js)

## Contributing

Contributions, bug reports and feature requests are welcome. Open an issue or submit a pull request on the repository.

## License

This project is open source and available under the [MIT License](LICENSE).