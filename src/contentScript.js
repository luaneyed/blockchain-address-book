'use strict';
// inject translation tooltip based on user text hover event
//it gets translation and tts from background.js


import $ from "jquery";
import 'bootstrap/js/dist/tooltip';
import { enableSelectionEndEvent } from "./selection";

//init environment======================================================================\
var currentSetting = {};
var tooltipContainer;
var clientX = 0;
var clientY = 0;
var mouseTarget = null;
var activatedWord = null;
var doProcessPos = false;
var mouseMoved = false;
var settingLoaded = false;
var keyDownList = { //use key down for enable translation partially
  17: false, //ctrl
  16: false, //shift
  18: false //alt
};
var style = $("<style>").appendTo("head");
let selectedText = "";

//use mouse position for tooltip position
$(document).mousemove(function(event) {
  clientX = event.clientX;
  clientY = event.clientY;
  mouseTarget = event.target;
  mouseMoved = true;
  setTooltipPosition();
});
$(document).keydown(function(e) {
  if ((e.keyCode == 65 || e.keyCode == 70) && e.ctrlKey) { //user pressed ctrl+f  ctrl+a, hide tooltip
    mouseMoved = false;
    hideTooltip();
  } else {
    for (var key in keyDownList) { // check activation hold key pressed and record
      if (e.which == key.toString() && keyDownList[key] == false) { //run tooltip again with keydown on
        keyDownList[key] = true;
        activatedWord = null;
      }
    }
  }
});
$(document).keyup(function(e) {
  for (var key in keyDownList) {
    if (e.which == key.toString()) {
      keyDownList[key] = false;
    }
  }
});
document.addEventListener("visibilitychange", function() { //detect tab switching to turn off key down
  if (document.visibilityState === "hidden") { //reset all env value
    for (var key in keyDownList) { //reset key press when switching
      keyDownList[key] = false;
    }
    mouseMoved = false;
    hideTooltip();
  } else {
    activatedWord = null;
  }
});

//tooltip core======================================================================
//tooltip: init
$(document).ready(function() {
  getSetting(); //load setting from background js

  tooltipContainer = $('<div/>', {
    id: 'mttContainer',
    class: 'bootstrapiso', //apply bootstrap isolation css using bootstrapiso class
    css: {
      "left": 0,
      "top": 0,
      "position": "fixed",
      "z-index": "100000200",
      "width": "500px",
      "margin-left": "-250px",
    }
  }).appendTo(document.body);

  tooltipContainer.tooltip({
    placement: "top",
    container: "#mttContainer",
    trigger: "manual"
  });
});

enableSelectionEndEvent();

//determineTooltipShowHide based on hover
setInterval(async function() {
  // only work when tab is activated and when mousemove and no selected text
  if (!selectedText && document.visibilityState == "visible" && mouseMoved && settingLoaded) {
    let word = getMouseOverWord(clientX, clientY);
    await processWord(word, "mouseover");
  }
}, 200);

function filterString(s) {
  s = s.replace(/\s+/g, ' '); //replace whitespace as single space
  return s.trim(); // remove whitespaces from begin and end of word
}

function isAddress(s) {
  return s.startsWith('0x') && s.length === 42;
}

async function processWord(word, actionType) {
  if (!isAddress(word)) {
    word = '';
  }

  if (word && activatedWord != word) { //show tooltip, if current word is changed and word is not none
    activatedWord = word;
    var response = await find(word);

    //if empty
    //if tooltip is not on and activation key is not pressed,
    //then, hide
    if (!response || (currentSetting["useTooltip"] == "false" && !keyDownList[currentSetting["keyDownTooltip"]])) {
      hideTooltip();
    } else {
      tooltipContainer.attr('data-original-title', response);
      doProcessPos = true;
      setTooltipPosition();
      tooltipContainer.tooltip("show");
      recordHistory(word, response, actionType);
    }
  } else if (!word && activatedWord) { //hide tooltip, if activated word exist and current word is none
    activatedWord = null;
    hideTooltip();
  }
}

function getMouseOverWord(clientX, clientY) {
  //get mouse positioned char
  var range = document.caretRangeFromPoint(clientX, clientY);
  //if no range or is not text, give null
  if (range == null || range.startContainer.nodeType !== Node.TEXT_NODE) {
    return "";
  }
  
  range.setStartBefore(range.startContainer);
  range.setEndAfter(range.startContainer);

  //check mouse is actually in text bound rect
  var rect = range.getBoundingClientRect(); //mouse in word rect
  if (rect.left > clientX || rect.right < clientX ||
    rect.top > clientY || rect.bottom < clientY) {
    return "";
  }
  const { href } = range.startContainer.attributes;
  const leaf_path = href && href.value.split('/').pop();
  if (leaf_path && isAddress(leaf_path)) {
    return leaf_path;
  }

  let value = filterString(range.toString());
  if (isAddress(value)) {
    return value;
  }
  
  range.expand('word');
  value = filterString(range.toString());
  if (isAddress(value)) {
    return value;
  }

  range.expand('sentence');
  return filterString(range.toString());
}

function hideTooltip() {
  doProcessPos = false;
  tooltipContainer.tooltip("hide");
}

function setTooltipPosition() {
  if (activatedWord != null && doProcessPos == true) {
    tooltipContainer.css("transform", "translate(" + clientX + "px," + clientY + "px)");
  }
}

async function find(address) {
  return sendMessagePromise({ type: 'find', address });
}

function recordHistory(sourceText, targetText, actionType) {
  //if action is record trigger action, do record
  if (currentSetting["historyRecordActions"].includes(actionType)) {
    chrome.runtime.sendMessage({ //send history to background.js
        type: 'recordHistory',
        "sourceText": sourceText,
        "targetText": targetText,
      },
      response => {}
    );
  }
}

function getSetting() { //load  setting from background js
  chrome.runtime.sendMessage({
      type: 'loadSetting',
      withoutHistory: true
    },
    response => {
      currentSetting = response;
      applyStyleSetting(currentSetting);
      settingLoaded = true;
    }
  );
}

chrome.storage.onChanged.addListener(function(changes, namespace) { //update current setting value,
  //skip history data
  delete changes['historyList'];
  for (var key in changes) {
    currentSetting[key] = changes[key].newValue;
  }
  // if style changed
  if (changes["tooltipFontSize"] || changes["tooltipWidth"]) {
    applyStyleSetting(currentSetting);
  }
});

function applyStyleSetting(setting) {
  //apply css
  style.html(`
    .bootstrapiso .tooltip {
      font-size: ` + setting["tooltipFontSize"] + `px;
    }
    .bootstrapiso .tooltip-inner {
      max-width: ` + setting["tooltipWidth"] + `px;
    }
    `);
}

function sendMessagePromise(item) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(item, response => {
      resolve(response);
    });
  });
}
