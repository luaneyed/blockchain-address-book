'use strict';

//interact user setting,
//save and load setting from background.js

import "typeface-roboto/index.css"; //font for vuetify
import '@mdi/font/css/materialdesignicons.css' // Ensure you are using css-loader
import 'vuetify/dist/vuetify.min.css'; //vuetify css
import Vue from 'vue'; //vue framework
import Vuetify from 'vuetify'; //vue style


Vue.use(Vuetify);

var toggleList = {
  "On": "true",
  "Off": "false"
};
var keyList = {
  "None": "null",
  "Ctrl": "17",
  "Alt": "18",
  "Shift": "16"
};

var tooltipFontSizeList = {}; //font size 5 to 20
for (let i = 5; i < 21; i++) {
  tooltipFontSizeList[String(i)] = String(i);
}
var detectTypeList = {
  'Word': 'word',
  'Sentence': 'sentence',
  'Container': 'container'
}

var tooltipWidth={};
for (let i = 100; i < 600; i+=100) {
  tooltipWidth[String(i)] = String(i);
}

var settingList = {
  "useTooltip": {
    "description": "Enable Tooltip",
    "optionList": toggleList
  },
  "translateOnHover": {
    "description": "Translate on hover",
    "optionList": toggleList
  },
  "translateOnSelection": {
    "description": "Translate on selection",
    "optionList": toggleList
  },
  "keyDownTooltip": {
    "description": "Tooltip Activation Hold Key",
    "optionList": keyList
  },
  "detectType": {
    "description": "Detect Type",
    "optionList": detectTypeList
  },
  "tooltipFontSize": {
    "description": "Tooltip Font Size",
    "optionList": tooltipFontSizeList
  },
  "tooltipWidth":{
    "description": "Tooltip Width",
    "optionList": tooltipWidth
  },
};
//add text key and val key to option list
function capsulateOptionList(){
  for (const [key1, val1] of Object.entries(settingList)) {
    var capsulate=[]
    for (const [key2, val2] of Object.entries(settingList[key1]["optionList"])) {
      capsulate.push({
        "text": key2,
        "val":val2
      })
    }
    settingList[key1]["optionList"]=capsulate
  }
}
capsulateOptionList();


var aboutPageList = {
  "extensionSetting": {
    name: "Extension Setting",
    sub_name: chrome.runtime.getManifest().version, //manifest version
    url: "chrome://extensions/?id=hmigninkgibhdckiaphhmbgcghochdjc",
    icon: "mdi-cog"
  },
  "reviewPage": {
    name: "Review Page",
    sub_name: "Comment on this extension",
    url: "https://chrome.google.com/webstore/detail/hmigninkgibhdckiaphhmbgcghochdjc/reviews",
    icon: "mdi-message-draw"
  },
  "sourceCode": {
    name: "Source code",
    sub_name: "Check source code in github",
    url: "https://github.com/luaneyed/blockchain-address-book",
    icon: "mdi-github"
  },
  "privacyPolicy": {
    name: "Privacy Policy",
    sub_name: "User privacy policy",
    url: "https://github.com/luaneyed/blockchain-address-book/blob/main/doc/privacy_policy.md",
    icon: "mdi-shield-account"
  },
}


new Vue({
  data: {
    settingList: settingList,
    aboutPageList: aboutPageList,
    currentSetting: {},
    currentPage:"main",
    historyRecordActionNames: [
      "select",
      "mouseover"
    ],
    copyAlertBar:false,
  },
  async beforeCreate() {
    //loadSettingFromBackground
    this.currentSetting = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        type: 'loadSetting'
      }, response => {
        resolve(response);
      });
    });
  },
  methods: {
    onSelectChange(event, name) {
      this.currentSetting[name] = event;
      //when activation hold key is set, turn off permanent feature enable
      if (name == "keyDownTooltip" && event != "null") {
        this.currentSetting["useTooltip"] = "false";
      }
      this.changeSetting();
    },
    changeSetting() {
      chrome.runtime.sendMessage({ //save setting from background.js
          type: 'saveSetting',
          options: this.currentSetting
        },
        response => {}
      );
    },
    removeAllHistory(){
      this.currentSetting["historyList"]=[];
      this.changeSetting();
    },
    removeHistory(index) {
      this.currentSetting["historyList"].splice(index, 1);
      this.changeSetting();
    },
    downloadCSV(){
      var arr=this.currentSetting["historyList"];
      var csv = arr.map(function(v){return v["sourceText"].replace(/\n|\r|,|'|"/g, " ")+','+v["targetText"].replace(/\n|\r|,|'|"/g, " ")}).join('\n');
      var link = document.createElement("a");
      link.href = encodeURI("data:text/csv;charset=utf-8,"+csv);
      link.download = "export.csv";
      link.click();
    },
    copyToClipboard(sourceText,targetText){
      var text = sourceText+" \n"+targetText;
      navigator.clipboard.writeText(text).then((response) => {
        this.copyAlertBar=true;
      });
    },
  },
  el: '#app',
  vuetify: new Vuetify({
    icons: {
      iconfont: 'mdi'
    }
  }),
});
