// This is an active module of the mort253 (3) Add-on
exports.main = function() {

var pageMod = require("page-mod");
ss = require("simple-storage");//
var data = require("self").data;
  

// if simple-storage is undefined, setup the default data structure
if(typeof(ss.storage.stackInboxStorage) === 'undefined') {
  console.log("load: storage is undefined, so set default"); //so load from prefs...");
  ss.storage.stackInboxStorage = {"accounts":{},"stackInbox":{"account-abc":{"account_id":0,"newItemCol":""}}};
  
} else {
    console.log("storage defined!");
    if(true)  // debug
      ss.storage.stackInboxStorage = 
        { "accounts": {
            "stackoverflow-552792":265671
        },
        "stackInbox": {
            "account-265671": {
                "account_id": 265671,
                "newItemCol": "http://workplace.stackexchange.com/posts/comments/48262?noredirect=1,http://freelancing.stackexchange.com/posts/comments/1698?noredirect=1" 
            }
        }
      };
    console.log("ss.storage.stackInboxStorage = " + ss.storage.stackInboxStorage );
}

console.log("storage on load = " + JSON.stringify(ss.storage.stackInboxStorage));



// inject the content script onto the page
pageMod.add(new pageMod.PageMod({
  include: ["*.stackoverflow.com","*.stackexchange.com","*.superuser.com",
      "*.serverfault.com","*.mathoverflow.net","*.stackapps.com","*.askubuntu.com"],
  //contentScript: "alert('injection');console.log('injected')"
  contentScriptFile: [data.url('jquery-2.1.0.min.js'),data.url('stackInboxFirefox.js')],
  contentScriptOptions: {
    stackInboxStorage: ss.storage.stackInboxStorage
  },
  onAttach: function(worker) {
    worker.on('message', function(message) {
      console.log('received: ' + JSON.stringify(message));
      console.debug("before save sanity check on storage accounts = " + JSON.stringify(ss.storage.stackInboxStorage.accounts));
      if(message.action == "storeAccount") {
          console.info("bg:onAttach:: storeAccount:: account id received in background page = " + message.account_id);
          
          console.info("bg:onAttach:: storeAccount:: storage returned to background page = " + JSON.stringify(message.storage));
          
          ss.storage.stackInboxStorage = message.storage;
          console.debug("bg:onAttach:: storeAccount:: sanity check on storage = " + JSON.stringify(ss.storage.stackInboxStorage.accounts));
          ///console.debug("bg:onAttach:: storeAccount:: accounts = " + ss.storage.stackInboxStorage.accounts['meta.stackoverflow-155826']);

      } else {
          console.log('bg:onAttach:: :: newColItem = ' + message.newItemCol);
          // store newColItem in simple-storage
          ss.storage.stackInboxStorage.stackInbox['account-'+message.account_id].newItemCol = message.newItemCol;

          console.info("ss.storage.ss toString = " + JSON.stringify(ss.storage.stackInboxStorage));
          
          console.log('bg:onAttach:: :: stored newColItem = ' + ss.storage.stackInboxStorage.stackInbox['account-'+message.account_id].newItemCol);
          
      }
      
    });
    worker.postMessage(ss.storage.stackInboxStorage);
  }
  
}));


};


/*
{
    "accounts": {
        "answers.onstartups-6362": 265671,
        "bicycles-5575": 265671,
        "codereview-1393": 265671,
        "discuss.area51-29959": 265671,
        "genealogy-71": 265671,
        "meta.bicycles-5575": 265671,
        "meta.genealogy-71": 265671,
        "meta.pm-34": 265671,
        "meta.programmers-12611": 265671,
        "meta.stackoverflow-155826": 265671,
        "meta.unix-6509": 265671,
        "meta.webapps-7704": 265671,
        "meta.workplace-98": 265671,
        "pm-34": 265671,
        "programmers-12611": 265671,
        "serverfault-65253": 265671,
        "stackapps-4812": 265671,
        "stackoverflow-552792": 265671,
        "superuser-61231": 265671,
        "ux-9498": 265671,
        "webapps-7704": 265671,
        "workplace-98": 265671
    },
    "stackInbox": {
        "account-265671": {
            "account_id": 265671,
            "newItemCol": "http://genealogy.stackexchange.com/posts/comments/3060,http://meta.stackoverflow.com/posts/comments/451368,http://meta.stackoverflow.com/posts/comments/451407,http://chat.stackexchange.com/transcript/message/7024857#7024857,http://chat.stackexchange.com/transcript/message/7024748#7024748,http://area51.stackexchange.com/proposals/41577,http://meta.stackoverflow.com/posts/comments/452379"
        },
        "account-undefined": {}
    }
}


*/