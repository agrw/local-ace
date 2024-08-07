
//
// Service working setup
//
window.addEventListener('load', () => {
    registerSW();
});


async function registerSW() {
    if ('serviceWorker' in navigator) {
        try {
            await navigator
                .serviceWorker
                .register('serviceworker.js');
        }
        catch (e) {
            console.log('SW registration failed');
        }
    }
}

////////////////////////////////////////////////

let menuContent = document.querySelector('.menu-content');

window.onclick = function (event) {
    if (event.target.matches('.unstyled-button') && menuContent.style.display=="" ) {
        menuContent.style.display = "block";
    } else if (!event.target.matches(".menu-input")) {
        menuContent.style.display = "";
    }
}

document.getElementById('ReadFile').addEventListener('click', (event) => {
    localfile.openFile();
});

document.getElementById('WriteFile').addEventListener('click', (event) => {
    localfile.saveFileAs(document.getElementById("FileName").value);
});

document.getElementById('FileName').addEventListener("keyup", ({ key }) => {
    if (key === "Enter") {
        // Do work
        var filename = document.getElementById("FileName").value
        localStorage.setItem(filename, editor.getValue());
        document.title = filename
        editor.focus()
    }
})


localfile.setText = (val) => {
    val = val || '';
    editor.setValue(val, -1)

    localStorage.setItem(localfile.file.name, val);
};

localfile.setModified = (val) => {
    textChanged = true
}

localfile.setFocus = (startAtTop) => {
    editor.focus()
}

localfile.getText = () => {
    return editor.getValue()
};

localfile.setFile = (fileHandle) => {
    if (fileHandle && fileHandle.name) {
        localfile.file.handle = fileHandle;
        localfile.file.name = fileHandle.name;

        document.getElementById("FileName").value = fileHandle.name

    } else {
        localfile.file.handle = null;
        localfile.file.name = fileHandle;
        var fileName = document.getElementById('filePicker').files[0].name;
        document.getElementById("FileName").value = fileName
        localfile.file.name = fileHandle;
    }
};

var programName = "local-ace";
var version = " v.0.0.52";
document.title = programName;
var helpText = `
This is a Progressive Web App of ace editor.  
With this app you can edit a text file from your browser 
or desktop. 

Top Menu: ≡ ↘ ↗  []

 ≡  click to select: 
     install - option to install on desktop.
      help    - this help info, click again to resume editing.
 ↘  to read a file,
 ↗  to write a file.
 [] filename text box 

The tab size is set in url config using 'tab=number'. 
    
Editing functionality is provided by https://ace.c9.io/#nav=about  
using see https://github.com/ajaxorg/ace/wiki/Default-Keyboard-Shortcuts 
about keys short cuts.

Enjoy
`

var editor = ace.edit("EditText")
editor.setTheme("ace/theme/chrome")
editor.getSession().on('change',
    function () { textChanged = true; }
)

function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
        vars[key] = unescape(value)
    })
    return vars
}

function SetValuesInUrl(tabValue, editValue) {
    var urlEdit = getUrlVars()['edit']
    var urlTab = getUrlVars()['tab']

    if ((urlEdit == null || urlEdit != editValue) || (urlTab == null || urlTab != tabValue)) {
        var newURL = location.protocol + '//' + location.host + location.pathname + "#config?edit=" + editValue + "&tab=" + tabValue
        location.assign(newURL)
    }
}

var textChanged = false
var enableLogging = false
var FileHandle

function DebugLog(string) {
    if (enableLogging) console.log(string)
}

function SetElementValueFromItemValue(elementName, itemName) {
    var Element = document.getElementById(elementName)
    var Item = document.getElementById(itemName)
    if (localStorage.getItem(Item.value) != null) {
        var newvalue = localStorage.getItem(Item.value)
        editor.setValue(newvalue, -1); //Element.value = localStorage.getItem(Item.value)
    }
    DebugLog("getItem( " + Item.value + " )= " + editor.getValue())
}

function GetText() {
    SetElementValueFromItemValue("EditText", "FileName")
    textChanged = true
}

function SaveText() {
    if (textChanged) {
        var FileNameValue = document.getElementById("FileName").value
        
        if (FilenameElement.value  != programName + version ) {
            localStorage.setItem("\lastfile/", FilenameElement.value);
        }
        try {
            var newvalue = editor.getValue()
            localStorage.setItem(FileNameValue, newvalue)
        }
        catch (e) {
            // if (e == QUOTA_EXCEEDED_ERR)  QuotaExceededError
            if (e == QuotaExceededError) // IE error message?? ***FIXME***
            {
                alert(e + 'Quota exceeded!')  //data wasn't successfully saved due to quota exceed so throw an error
            }
        }

        textChanged = false
    }
}



var FilenameElement = document.getElementById("FileName")

var myEdit = getUrlVars()['edit']

if (myEdit == null) {
    myEdit = localStorage.getItem("\lastfile/")
}

if (myEdit != null) {
    FilenameElement.value = myEdit
    editor.setValue("", -1)

    var newMode = myEdit.split('.').pop().toLowerCase()
    var convert = { "js": "javascript", "xml": "xml", "gsl": "xml", "json": "json", "htm": "html", "html": "html", "ts": "typescript", "css": "css" }
    if (convert[newMode] == null) convert[newMode] = "text"

    editor.session.setMode("ace/mode/" + convert[newMode])
    GetText()
}
else {
    document.title = "local-ace";
    FilenameElement.value = programName + version;
    editor.setValue(helpText, -1);
    textChanged = true;
    SaveText();
}

var tabValue = getUrlVars()['tab']
if (tabValue == null) {
    tabValue = 4  // default tab size
}

editor.session.setTabSize(tabValue)
editor.session.setUseWrapMode(true)


document.getElementById('TabNumber').value = tabValue
document.getElementById('WrapToggle').checked = true

SetValuesInUrl(tabValue, document.getElementById("FileName").value)

document.title = FilenameElement.value == "" ? document.title : programName

window.setInterval(SaveText, 2000)

editor.focus()
