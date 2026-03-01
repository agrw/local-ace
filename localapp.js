'use strict';

// ─── Constants ───────────────────────────────────────────────────────────────

const PROGRAM_NAME = 'local-ace';
const VERSION = '1.0.0';
const AUTO_SAVE_INTERVAL_MS = 2000;
const DEFAULT_TAB_SIZE = 4;

const EXTENSION_MODE_MAP = {
  js:   'javascript',
  xml:  'xml',
  gsl:  'xml',
  json: 'json',
  htm:  'html',
  html: 'html',
  ts:   'typescript',
  css:  'css',
};

const HELP_TEXT = `
This is a Progressive Web App of the Ace editor.
Edit text files directly from your browser or desktop.

─── Toolbar ───────────────────────────────────
  ≡   Menu: tab size, word wrap, help
  ↘   Open file
  ↗   Save file
  []  Filename (editable — press Enter to confirm)

─── Tips ──────────────────────────────────────
  • Tab size is also configurable via the URL: ?tab=4
  • Keyboard shortcuts: https://github.com/ajaxorg/ace/wiki/Default-Keyboard-Shortcuts
  • Works offline as a Progressive Web App

${PROGRAM_NAME} ${VERSION}  —  Enjoy!
`;

// ─── Service Worker ──────────────────────────────────────────────────────────

window.addEventListener('load', registerServiceWorker);

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('serviceworker.js');
  } catch (e) {
    console.warn('Service worker registration failed:', e);
  }
}

// ─── Editor Setup ────────────────────────────────────────────────────────────

const editor = ace.edit('EditText');
editor.setTheme('ace/theme/chrome');
editor.session.on('change', () => { textChanged = true; });

let textChanged = false;
let FileHandle;

// ─── URL Utilities ───────────────────────────────────────────────────────────

function getUrlParams() {
  const vars = {};
  window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, (m, key, value) => {
    vars[key] = unescape(value);
  });
  return vars;
}

function syncUrlParams(tabSize, filename) {
  const params = getUrlParams();
  if (params.edit !== filename || params.tab !== String(tabSize)) {
    const newURL =
      `${location.protocol}//${location.host}${location.pathname}` +
      `#config?edit=${filename}&tab=${tabSize}`;
    location.assign(newURL);
  }
}

// ─── localStorage Helpers ────────────────────────────────────────────────────

function loadFromStorage(filename) {
  const saved = localStorage.getItem(filename);
  if (saved !== null) {
    editor.setValue(saved, -1);
  }
}

function saveToStorage(filename, content) {
  try {
    localStorage.setItem(filename, content);
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      alert('Storage quota exceeded — unable to save.');
    } else {
      console.error('Storage error:', e);
    }
  }
}

// ─── Save Logic ──────────────────────────────────────────────────────────────

function autoSave() {
  if (!textChanged) return;

  const filename = filenameInput.value;
  if (filename && filename !== `${PROGRAM_NAME} ${VERSION}`) {
    localStorage.setItem('\lastfile/', filename);
  }

  saveToStorage(filename, editor.getValue());
  textChanged = false;
}

// ─── File Mode Detection ─────────────────────────────────────────────────────

function detectMode(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  return EXTENSION_MODE_MAP[ext] || 'text';
}

// ─── UI Wiring ───────────────────────────────────────────────────────────────

const menuContent = document.querySelector('.menu-content');
const filenameInput = document.getElementById('FileName');

// Menu toggle
window.addEventListener('click', (event) => {
  if (event.target.closest('.menu-btn > button') && menuContent.style.display === '') {
    menuContent.style.display = 'block';
  } else if (!event.target.matches('.menu-input') && !event.target.closest('.menu-content')) {
    menuContent.style.display = '';
  }
});

// Help / About: load help text into editor
document.getElementById('HelpAbout').addEventListener('click', (e) => {
  e.preventDefault();
  menuContent.style.display = '';
  filenameInput.value = `${PROGRAM_NAME} ${VERSION}`;
  editor.setValue(HELP_TEXT, -1);
  editor.session.setMode('ace/mode/text');
  document.title = `${PROGRAM_NAME} ${VERSION}`;
  textChanged = true;
  editor.focus();
});

// Read / write buttons
document.getElementById('ReadFile').addEventListener('click', () => localfile.openFile());
document.getElementById('WriteFile').addEventListener('click', () => {
  localfile.saveFileAs(filenameInput.value);
});

// Filename input: Enter to save & switch mode
filenameInput.addEventListener('keyup', ({ key }) => {
  if (key !== 'Enter') return;
  const filename = filenameInput.value;
  saveToStorage(filename, editor.getValue());
  document.title = filename;
  editor.session.setMode(`ace/mode/${detectMode(filename)}`);
  editor.focus();
});

// Filename change: load from storage
filenameInput.addEventListener('change', () => {
  const filename = filenameInput.value;
  loadFromStorage(filename);
  textChanged = true;
  syncUrlParams(tabSizeInput.value, filename);
});

// Tab size change
const tabSizeInput = document.getElementById('TabNumber');
tabSizeInput.addEventListener('change', () => {
  const size = parseInt(tabSizeInput.value, 10);
  editor.session.setTabSize(size);
  syncUrlParams(size, filenameInput.value);
});

// Word wrap toggle
document.getElementById('WrapToggle').addEventListener('change', (e) => {
  editor.session.setUseWrapMode(e.target.checked);
});

// ─── localfile callbacks ─────────────────────────────────────────────────────

localfile.setText = (val = '') => {
  editor.setValue(val, -1);
  saveToStorage(localfile.file.name, val);
};

localfile.setModified = () => { textChanged = true; };
localfile.setFocus = () => { editor.focus(); };
localfile.getText = () => editor.getValue();

localfile.setFile = (fileHandle) => {
  if (fileHandle && fileHandle.name) {
    localfile.file.handle = fileHandle;
    localfile.file.name = fileHandle.name;
    filenameInput.value = fileHandle.name;
  } else {
    localfile.file.handle = null;
    localfile.file.name = fileHandle;
    const legacyName = document.getElementById('filePicker').files[0]?.name;
    filenameInput.value = legacyName || fileHandle;
    localfile.file.name = fileHandle;
  }
};

// ─── Initialization ──────────────────────────────────────────────────────────

(function init() {
  document.title = PROGRAM_NAME;

  // Set help/about link
  const params = getUrlParams();
  const helpLink = document.getElementById('HelpAbout');
  helpLink.href =
    `${location.protocol}//${location.host}${location.pathname}` +
    `#config?edit=${PROGRAM_NAME} ${VERSION}&tab=${params.tab}`;

  // Restore last file or show help
  let currentFile = params.edit || localStorage.getItem('\lastfile/');

  if (currentFile) {
    filenameInput.value = currentFile;
    editor.setValue('', -1);
    editor.session.setMode(`ace/mode/${detectMode(currentFile)}`);
    loadFromStorage(currentFile);
  } else {
    document.title = PROGRAM_NAME;
    filenameInput.value = `${PROGRAM_NAME} ${VERSION}`;
    editor.setValue(HELP_TEXT, -1);
    textChanged = true;
    autoSave();
  }

  // Apply tab size
  const tabSize = parseInt(params.tab, 10) || DEFAULT_TAB_SIZE;
  editor.session.setTabSize(tabSize);
  editor.session.setUseWrapMode(true);

  tabSizeInput.value = tabSize;
  document.getElementById('WrapToggle').checked = true;

  syncUrlParams(tabSize, filenameInput.value);

  document.title = filenameInput.value || PROGRAM_NAME;

  // Auto-save every 2 seconds
  setInterval(autoSave, AUTO_SAVE_INTERVAL_MS);

  editor.focus();
})();
