

'use strict';

function gaEvent(category, action, label, ) {
    console.log('🔔', category, action, label);
}

/* globals getFileHandle, getNewFileHandle, readFile, verifyPermission,
           writeFile */

// eslint-disable-next-line no-redeclare
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
  hasFSAccess: 'chooseFileSystemEntries' in window ||
               'showOpenFilePicker' in window,
  isMac: navigator.userAgent.includes('Mac OS X'),
};

// Verify the APIs we need are supported, show a polite warning if not.
if (localfile.hasFSAccess) {
 // document.getElementById('not-supported').classList.add('hidden');
  gaEvent('File System APIs', 'FSAccess');
} else {
//  document.getElementById('lblLegacyFS').classList.toggle('hidden', false);
//  document.getElementById('butSave').classList.toggle('hidden', true);
  gaEvent('File System APIs', 'Legacy');
}

/**
 * Creates an empty notepad with no details in it.
 */
localfile.newFile = () => {
  if (!localfile.confirmDiscard()) {
    return;
  }
  localfile.setText();
  localfile.setFile();
  localfile.setModified(false);
  localfile.setFocus(true);
  gaEvent('FileAction', 'New');
};


/**
 * Opens a file for reading.
 *
 * @param {FileSystemFileHandle} fileHandle File handle to read from.
 */
localfile.openFile = async (fileHandle) => {
 // if (!localfile.confirmDiscard()) {
 //   return;
 // }

  // If the File System Access API is not supported, use the legacy file apis.
  if (!localfile.hasFSAccess) {
    gaEvent('FileAction', 'Open', 'Legacy');
    const file = await localfile.getFileLegacy();
    if (file) {
      localfile.readFile(file);
    }
    return;
  }

  // If a fileHandle is provided, verify we have permission to read/write it,
  // otherwise, show the file open prompt and allow the user to select the file.
  if (fileHandle) {
    gaEvent('FileAction', 'OpenRecent', 'FSAccess');
    if (await verifyPermission(fileHandle, true) === false) {
      console.error(`User did not grant permission to '${fileHandle.name}'`);
      return;
    }
  } else {
    gaEvent('FileAction', 'Open', 'FSAccess');
    try {
      fileHandle = await getFileHandle();
    } catch (ex) {
      if (ex.name === 'AbortError') {
        return;
      }
      gaEvent('Error', 'FileOpen', ex.name);
      const msg = 'An error occured trying to open the file.';
      console.error(msg, ex);
      alert(msg);
    }
  }

  if (!fileHandle) {
    return;
  }
  const file = await fileHandle.getFile();
  localfile.readFile(file, fileHandle);
};

/**
 * Read the file from disk.
 *
 *  @param {File} file File to read from.
 *  @param {FileSystemFileHandle} fileHandle File handle to read from.
 */
localfile.readFile = async (file, fileHandle) => {
  try {
    localfile.setText(await readFile(file));
    localfile.setFile(fileHandle || file.name);
    localfile.setModified(false);
    localfile.setFocus(true);
  } catch (ex) {
    gaEvent('Error', 'FileRead', ex.name);
    const msg = `An error occured reading ${localfile.fileName}`;
    console.error(msg, ex);
    alert(msg);
  }
};

/**
 * Saves a file to disk.
 */
localfile.saveFile = async () => {
  try {
    if (!localfile.file.handle) {
      return await localfile.saveFileAs();
    }
    gaEvent('FileAction', 'Save');
    await writeFile(localfile.file.handle, localfile.getText());
    localfile.setModified(false);
  } catch (ex) {
    gaEvent('Error', 'FileSave', ex.name);
    const msg = 'Unable to save file';
    console.error(msg, ex);
    alert(msg);
  }
  localfile.setFocus();
};

/**
 * Saves a new file to disk.
 */
localfile.saveFileAs = async () => {
  if (!localfile.hasFSAccess) {
    gaEvent('FileAction', 'Save As', 'Legacy');
    localfile.saveAsLegacy(localfile.file.name, localfile.getText());
    localfile.setFocus();
    return;
  }
  gaEvent('FileAction', 'Save As', 'FSAccess');
  let fileHandle;
  try {
    fileHandle = await getNewFileHandle();
  } catch (ex) {
    if (ex.name === 'AbortError') {
      return;
    }
    gaEvent('Error', 'FileSaveAs1', ex.name);
    const msg = 'An error occured trying to open the file.';
    console.error(msg, ex);
    alert(msg);
    return;
  }
  try {
    await writeFile(fileHandle, localfile.getText());
    localfile.setFile(fileHandle);
    localfile.setModified(false);
  } catch (ex) {
    gaEvent('Error', 'FileSaveAs2', ex.name);
    const msg = 'Unable to save file.';
    console.error(msg, ex);
    alert(msg);
    gaEvent('Error', 'Unable to write file', 'FSAccess');
    return;
  }
  localfile.setFocus();
};

/**
 * Attempts to close the window
 */
localfile.quitlocalfile = () => {
  if (!localfile.confirmDiscard()) {
    return;
  }
  gaEvent('FileAction', 'Quit');
  window.close();
};

////////////////////////////////////////////////////////////////////

/**
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/* exported getFileHandle, getNewFileHandle, readFile, verifyPermission,
            writeFile */

/**
 * Open a handle to an existing file on the local file system.
 *
 * @return {!Promise<FileSystemFileHandle>} Handle to the existing file.
 */
function getFileHandle() {
  // For Chrome 86 and later...
  if ('showOpenFilePicker' in window) {
    return window.showOpenFilePicker().then((handles) => handles[0]);
  }
  // For Chrome 85 and earlier...
  return window.chooseFileSystemEntries();
}

/**
 * Create a handle to a new (text) file on the local file system.
 *
 * @return {!Promise<FileSystemFileHandle>} Handle to the new file.
 */
function getNewFileHandle() {
  // For Chrome 86 and later...
  if ('showSaveFilePicker' in window) {
    const opts = {
        startIn: FileHandle,
        suggestedName: document.getElementById("FileName").value,
    };
    return window.showSaveFilePicker(opts);
  }
  // For Chrome 85 and earlier...
  const opts = {
    type: 'save-file',
    accepts: [{
      description: 'Text file',
      extensions: ['txt'],
      mimeTypes: ['text/plain'],
    }],
  };
  return window.chooseFileSystemEntries(opts);
}

/**
 * Reads the raw text from a file.
 *
 * @param {File} file
 * @return {!Promise<string>} A promise that resolves to the parsed string.
 */
function readFile(file) {
  // If the new .text() reader is available, use it.
  if (file.text) {
    return file.text();
  }
  // Otherwise use the traditional file reading technique.
  return _readFileLegacy(file);
}

/**
 * Reads the raw text from a file.
 *
 * @private
 * @param {File} file
 * @return {Promise<string>} A promise that resolves to the parsed string.
 */
function _readFileLegacy(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener('loadend', (e) => {
      const text = e.srcElement.result;
      resolve(text);
    });
    reader.readAsText(file);
  });
}

/**
 * Writes the contents to disk.
 *
 * @param {FileSystemFileHandle} fileHandle File handle to write to.
 * @param {string} contents Contents to write.
 */
async function writeFile(fileHandle, contents) {
  // Support for Chrome 82 and earlier.
  if (fileHandle.createWriter) {
    // Create a writer (request permission if necessary).
    const writer = await fileHandle.createWriter();
    // Write the full length of the contents
    await writer.write(0, contents);
    // Close the file and write the contents to disk
    await writer.close();
    return;
  }
  // For Chrome 83 and later.
  // Create a FileSystemWritableFileStream to write to.
  const writable = await fileHandle.createWritable();
  // Write the contents of the file to the stream.
  await writable.write(contents);
  // Close the file and write the contents to disk.
  await writable.close();
}

/**
 * Verify the user has granted permission to read or write to the file, if
 * permission hasn't been granted, request permission.
 *
 * @param {FileSystemFileHandle} fileHandle File handle to check.
 * @param {boolean} withWrite True if write permission should be checked.
 * @return {boolean} True if the user has granted read/write permission.
 */
async function verifyPermission(fileHandle, withWrite) {
  const opts = {};
  if (withWrite) {
    opts.writable = true;
    // For Chrome 86 and later...
    opts.mode = 'readwrite';
  }
  // Check if we already have permission, if so, return true.
  if (await fileHandle.queryPermission(opts) === 'granted') {
    return true;
  }
  // Request permission to the file, if the user grants permission, return true.
  if (await fileHandle.requestPermission(opts) === 'granted') {
    return true;
  }
  // The user did nt grant permission, return false.
  return false;
}

/**
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by localfilelicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

(function(localfile) {
  const filePicker = document.getElementById('filePicker');
  const aDownloadFile = document.getElementById('aDownloadFile');

  /**
   * Uses the <input type="file"> to open a new file
   *
   * @return {!Promise<File>} File selected by the user.
   */
  localfile.getFileLegacy = () => {
    return new Promise((resolve, reject) => {
      filePicker.onchange = (e) => {
        const file = filePicker.files[0];
        if (file) {
          resolve(file);
          return;
        }
        reject(new Error('AbortError'));
      };
      filePicker.click();
    });
  };

  /**
   * Saves a file by creating a downloadable instance, and clicking on the
   * download link.
   *
   * @param {string} filename Filename to save the file as.
   * @param {string} contents Contents of the file to save.
   */
  // function saveAsLegacy(filename, contents) {
  localfile.saveAsLegacy = (filename, contents) => {
    filename = filename || 'Untitled.txt';
    const opts = {type: 'text/plain'};
    const file = new File([contents], '', opts);
    aDownloadFile.href = window.URL.createObjectURL(file);
    aDownloadFile.setAttribute('download', filename);
    aDownloadFile.click();
  };
})(localfile);
