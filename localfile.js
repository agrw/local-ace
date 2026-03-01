'use strict';

// ─── File System Access ──────────────────────────────────────────────────────

const localfile = {
  localfileName: 'Text Editor',
  file: {
    handle: null,
    name: null,
    isModified: false,
  },
  options: {
    captureTabs: true,
    fontSize: 14,
    monoSpace: false,
    wordWrap: true,
  },
  hasFSAccess: 'chooseFileSystemEntries' in window || 'showOpenFilePicker' in window,
  isMac: navigator.userAgent.includes('Mac OS X'),
};

// ─── File Operations ─────────────────────────────────────────────────────────

localfile.newFile = () => {
  if (!localfile.confirmDiscard()) return;
  localfile.setText();
  localfile.setFile();
  localfile.setModified(false);
  localfile.setFocus(true);
};

localfile.openFile = async (fileHandle) => {
  if (!localfile.hasFSAccess) {
    const file = await localfile.getFileLegacy();
    if (file) localfile.readFile(file);
    return;
  }

  if (fileHandle) {
    if (await verifyPermission(fileHandle, true) === false) {
      console.error(`User did not grant permission to '${fileHandle.name}'`);
      return;
    }
  } else {
    try {
      fileHandle = await getFileHandle();
    } catch (ex) {
      if (ex.name === 'AbortError') return;
      console.error('An error occurred trying to open the file.', ex);
      alert('An error occurred trying to open the file.');
    }
  }

  if (!fileHandle) return;
  const file = await fileHandle.getFile();
  localfile.readFile(file, fileHandle);
};

localfile.readFile = async (file, fileHandle) => {
  try {
    localfile.setText(await readFile(file));
    localfile.setFile(fileHandle || file.name);
    localfile.setModified(false);
    localfile.setFocus(true);
  } catch (ex) {
    console.error(`An error occurred reading ${localfile.fileName}`, ex);
    alert(`An error occurred reading ${localfile.fileName}`);
  }
};

localfile.saveFile = async () => {
  try {
    if (!localfile.file.handle) {
      return await localfile.saveFileAs();
    }
    await writeFile(localfile.file.handle, localfile.getText());
    localfile.setModified(false);
  } catch (ex) {
    console.error('Unable to save file', ex);
    alert('Unable to save file');
  }
  localfile.setFocus();
};

localfile.saveFileAs = async () => {
  if (!localfile.hasFSAccess) {
    localfile.saveAsLegacy(localfile.file.name, localfile.getText());
    localfile.setFocus();
    return;
  }

  let fileHandle;
  try {
    fileHandle = await getNewFileHandle();
  } catch (ex) {
    if (ex.name === 'AbortError') return;
    console.error('An error occurred trying to open the file.', ex);
    alert('An error occurred trying to open the file.');
    return;
  }

  try {
    await writeFile(fileHandle, localfile.getText());
    localfile.setFile(fileHandle);
    localfile.setModified(false);
  } catch (ex) {
    console.error('Unable to save file.', ex);
    alert('Unable to save file.');
    return;
  }
  localfile.setFocus();
};

// ─── File System Helpers ─────────────────────────────────────────────────────

function getFileHandle() {
  if ('showOpenFilePicker' in window) {
    return window.showOpenFilePicker().then((handles) => handles[0]);
  }
  return window.chooseFileSystemEntries();
}

function getNewFileHandle() {
  if ('showSaveFilePicker' in window) {
    return window.showSaveFilePicker({
      startIn: FileHandle,
      suggestedName: document.getElementById('FileName').value,
    });
  }
  return window.chooseFileSystemEntries({
    type: 'save-file',
    accepts: [{ description: 'Text file', extensions: ['txt'], mimeTypes: ['text/plain'] }],
  });
}

function readFile(file) {
  if (file.text) return file.text();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener('loadend', (e) => resolve(e.srcElement.result));
    reader.readAsText(file);
  });
}

async function writeFile(fileHandle, contents) {
  if (fileHandle.createWriter) {
    const writer = await fileHandle.createWriter();
    await writer.write(0, contents);
    await writer.close();
    return;
  }
  const writable = await fileHandle.createWritable();
  await writable.write(contents);
  await writable.close();
}

async function verifyPermission(fileHandle, withWrite) {
  const opts = withWrite ? { writable: true, mode: 'readwrite' } : {};
  if (await fileHandle.queryPermission(opts) === 'granted') return true;
  if (await fileHandle.requestPermission(opts) === 'granted') return true;
  return false;
}

// ─── Legacy File Picker ──────────────────────────────────────────────────────

(function (localfile) {
  const filePicker = document.getElementById('filePicker');
  const aDownloadFile = document.getElementById('aDownloadFile');

  localfile.getFileLegacy = () => {
    return new Promise((resolve, reject) => {
      filePicker.onchange = (e) => {
        const file = filePicker.files[0];
        if (file) { resolve(file); return; }
        reject(new Error('AbortError'));
      };
      filePicker.click();
    });
  };

  localfile.saveAsLegacy = (filename, contents) => {
    filename = filename || 'Untitled.txt';
    const file = new File([contents], '', { type: 'text/plain' });
    aDownloadFile.href = window.URL.createObjectURL(file);
    aDownloadFile.setAttribute('download', filename);
    aDownloadFile.click();
  };
})(localfile);
