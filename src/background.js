'use strict';

var currentSetting = {};
var defaultList = {
  "useTooltip": "true",
  "translateOnHover": "true",
  "translateOnSelection": "false",
  "translateTarget": window.navigator.language,
  "keyDownTooltip": "null",
  'detectType': 'container',
  "tooltipFontSize": "14",
  "tooltipWidth": "200",
  "historyList": [],
  "historyRecordActions": [],
}

loadSetting();

chrome.contextMenus.create({
  title: "Manage Blockchain Address",
  contexts: ['all'],
  onclick: ({ selectionText }) => {
    if (!selectionText) {
      window.alert('Select an exact address');
    } if (!selectionText.startsWith('0x') || selectionText.length !== 42) {
      window.alert(`${selectionText} is not a valid address`);
    } else {
      edit(selectionText, window.prompt(selectionText));
    }
  },
});

//listen from contents js and background js =========================================================================================================
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.type === 'saveSetting') {
    saveSetting(request.options);
  } else if (request.type === 'loadSetting') {
    loadSetting(request.withoutHistory, sendResponse);
  } else if (request.type === 'recordHistory') {
    //append to front
    currentSetting["historyList"].unshift({
      "sourceText": request.sourceText,
      "targetText": request.targetText
    });
    //remove when too many list
    if (currentSetting["historyList"].length > 100) {
      currentSetting["historyList"].pop();
    }
    saveSetting(currentSetting);
  } else if (request.type === 'find') {
    chrome.storage.sync.get(request.address, (data) => { sendResponse(data[request.address]); });
  }

  return true;
});

function edit(address, name) {
  if (!address.startsWith('0x')) {
    return;
  }
  chrome.storage.sync.set({ [address]: name }, () => {});
}

function saveSetting(inputSettings) {
  chrome.storage.sync.set({ setting: inputSettings }, function() {
    currentSetting = inputSettings;
  });
}

function loadSetting(withoutHistory, callback) {
  chrome.storage.sync.get('setting', function(options) { //load setting
    for (const key of Object.keys(defaultList)) {
      if (withoutHistory && "historyList" == key) {
        continue
      }

      if (options[key]) { //if value exist, load. else load defualt val
        currentSetting[key] = options[key];
      } else {
        currentSetting[key] = defaultList[key];
      }
    }
    if (typeof callback !== 'undefined') {
      callback(currentSetting);
    };
  });
}
