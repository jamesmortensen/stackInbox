// ==UserScript==
// @name          StackInbox 
// @namespace     StackInbox
// @icon          http://www.gravatar.com/avatar.php?gravatar_id=e615596ec6d7191ab628a1f0cec0006d&r=PG&s=48&default=identicon#.png
// @description   Keeps unread items highlighted in the Stack Exchange inbox until each item is read.
// @copyright     2012, James Mortensen (http://stackoverflow.com/users/552792/jmort253) 
// @license       BSD License
// @license       (CC); http://creativecommons.org/licenses/by-nc-sa/3.0/
// @version       0.0.1
//
// @require   storage.js
//
// @include   http://stackapps.com/*
// @include   http://*.stackoverflow.com/*
// @include   http://stackoverflow.com/*
// @include   http://*.serverfault.com/*
// @include   http://serverfault.com/*
// @include   http://*.stackexchange.com/*
// @include   http://*.onstartups.com/*
//
// ==/UserScript==
function with_jquery(f, data) {
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.textContent = "(" + f.toString() + ")(jQuery, " + JSON.stringify(data)+ ")";
    document.body.appendChild(script);
};


//chrome.storage.local.set({"stackInbox": [ { "display_name":"jmort253","newItemCol":"http://meta.stackoverflow.com/posts/comments/442391,http://serverfault.com/posts/comments/482296" } ] }, function(sss) { alert(sss); });


window.addEventListener("load", function() { 

    if(window.location.hostname == "chat.stackexchange.com") {
    
        var displayName = $('.mention').html().toString().substring(1);
        var url = window.location.href.toString();
           
        return;
    }

    // insert the diamond
    var diamond = document.createElement("span"); diamond.setAttribute("class","mod-flair"); diamond.setAttribute("title","moderator");diamond.innerHTML="&diams;";
    document.querySelector("#hlinks-user").insertBefore(diamond, document.querySelector("#hlinks-user > .profile-link").nextSibling);

    // scrape the user profile information
    var profileArr = document.querySelector("#hlinks-user .profile-link").getAttribute("href").split("/");  
    var userId = profileArr[2];
    var displayName = profileArr[3];

    var urlArr = window.location.toString().split("/")[2].split('.');
    var site = "";
    for(var i = 0; i < urlArr.length - 1 && urlArr[i] != "stackexchange"; i++) { 
        site += urlArr[i]+".";
    }
    site = site.slice(0,site.length-1);

    getAccountIdFromStorage({"site" : site, "userId" : userId, "displayName" : displayName }, injectScriptInSE);



//initStorage();
 });

//ext_s.stackInbox[265671] = { "display_name":"jmort253","newItemCol" : "http://meta.stackoverflow.com/posts/comments/442391,http://serverfault.com/posts/comments/482296" };

function getAccountIdFromStorage(siteUser, injectScript) {

    console.info("userId = " + siteUser.userId + " : display Name = " + siteUser.displayName + " : site = " + siteUser.site);

    chrome.storage.local.get(null, (function(injectScript) {
      return function(storage) {
        m_storage = storage;
        var accounts = storage.accounts;
        if(accounts) { 
            var accountId = accounts[siteUser.site+"-"+siteUser.userId];
            if(!accountId) {
                getDataFromApi(siteUser, storage, injectScript);
            } else {
                console.info("accountId = " + accountId);
                ext_s = storage;
                injectScript(storage.stackInbox["account-"+accountId]);
            }
        } else {        
            console.info("no accounts found. Allocate storage...");
            storage.accounts = {};
            getDataFromApi(siteUser, storage, injectScript);
        }
      }
        
    })(injectScript));

}

function getDataFromApiTest(siteUser, storage, injectScript) {
    console.warn("Using CACHED DATA to avoid maxing out API...");
    xhr = {};
    xhr.readyState = 4;
    if(siteUser.site == "stackoverflow") {
       xhr.responseText = '{"items":[{"user_id":552792,"display_name":"jmort253","account_id":265671}],"quota_remaining":76,"quota_max":300,"has_more":false}';
    } else if(siteUser.site == "meta.stackoverflow") {
       xhr.responseText = '{"items":[{"user_id":155826,"display_name":"jmort253","account_id":265671}],"quota_remaining":76,"quota_max":300,"has_more":false}';
    } else if(siteUser.site == "pm" || siteUser.site == "meta.pm") {
        xhr.responseText = '{"items":[{"user_id":34,"display_name":"jmort253","account_id":265671}],"quota_remaining":76,"quota_max":300,"has_more":false}';
    } else if(siteUser.site == "workplace" || siteUser.site == "meta.workplace"){
        xhr.responseText = '{"items":[{"user_id":98,"display_name":"jmort253","account_id":265671}],"quota_remaining":76,"quota_max":300,"has_more":false}';
    } else {    
        xhr.responseText = '{"items":[{"user_id":98,"display_name":"jmort253","account_id":265671}],"quota_remaining":76,"quota_max":300,"has_more":false}';
        siteUser.site = "workplace";
        siteUser.userId = 98;
        siteUser.accountId = 265671;
        
    }
    getAccountId(siteUser, storage, injectScript);
}


function getDataFromApi(siteUser, storage, injectScript) {  

    // for testing to avoid killing the SE API!
//    getDataFromApiTest(siteUser, storage, injectScript); return;
    
    console.info("get data from api");
    // get account id
    xhr = new XMLHttpRequest();
    xhr.onreadystatechange = (function(siteUser, storage, injectScript) { 
        return function() {
            getAccountId(siteUser, storage, injectScript);
        }
    })(siteUser, storage, injectScript);  // Implemented elsewhere.
//    xhr.onreadystatechange = getAccountId;
    console.info("make request to " + "https://api.stackexchange.com/2.1/users?order=desc&sort=reputation&inname="+siteUser.displayName+"&site="+siteUser.site+"&filter=!*MxJcsxUhQG*kL8D");
    xhr.open("GET", "https://api.stackexchange.com/2.1/users?order=desc&sort=reputation&inname="+siteUser.displayName+"&site="+siteUser.site+"&filter=!*MxJcsxUhQG*kL8D", true);
    xhr.send();    
    
//    https://api.stackexchange.com/2.1/users?order=desc&sort=reputation&inname=jmort253&site=stackoverflow&filter=!*MxJcsxUhQG*kL8D&callback=test

}

function getAccountId(siteUser, storage, injectScript) {
    console.info("inside getAccountId...");
    if(xhr.readyState == 4) {
      console.info("ready...");
//    if(xhr.status == 200) { alert("done")
        result = xhr.responseText;
        resultArr = JSON.parse(result).items;
        for(var i = 0; i < resultArr.length; i++) {
            if(siteUser.userId == resultArr[i].user_id) {
                siteUser.accountId = resultArr[i].account_id;
                break;
            }
        }
        console.info("accountId = " + siteUser.accountId);
        // init app
        storage.accounts[siteUser.site+"-"+siteUser.userId] = siteUser.accountId;      
        if(!storage.stackInbox) {
            storage.stackInbox = {};
            storage.stackInbox["account-"+siteUser.accountId] = {"newItemCol" : "", "account_id" : siteUser.accountId };
        }
        console.info("storage accounts = " + JSON.stringify(storage.accounts));  
        ext_s = storage;
        console.info("inject data in page...");
        injectScript(storage.stackInbox["account-"+siteUser.accountId]);
/*        chrome.storage.local.set(storage.stackInbox, function() {
               console.info("stackInbox data stored...");
        });*/
        chrome.storage.local.set(storage, function() {
               console.info("accounts data stored...");
	       chrome.storage.local.get(null, function(s) {
	           console.info("this is stored = " + JSON.stringify(s));
	       });
        });
    }

}

//        for(var i = 0 ; i < storage.length; i++) {
//            if(storage[i].display_name == )
       
  //      }


// receive message from page
window.addEventListener("message", function(event) { 
    console.info("data received = " + JSON.stringify(event.data));
    
    m_storage.stackInbox["account-" + event.data.account_id] = {"newItemCol" : event.data.newItemCol, "account_id" : event.data.account_id };
    
    chrome.storage.local.set(m_storage, function() { } );
    
    chrome.storage.local.get(null, function(ssss) { 
        console.info("After storing data, we now have = " + JSON.stringify(ssss));
    } );

}, false);



function injectScriptInSE(stackInboxStorage) {
    /**
 This is code added to the page context.
*/
    with_jquery(function ($, stackInboxStorage) {

        // API to get accountId without OAuth - scrape displayname....
        // https://api.stackexchange.com/2.1/users?order=desc&sort=reputation&inname=jmort253&site=stackoverflow&filter=!*MxJcsxUhQG*kL8D&callback=test


        console.info("stackInboxStorage = " + JSON.stringify(stackInboxStorage));
        window.localStorage.setItem("newItemCol", stackInboxStorage.newItemCol);

        var log = {
            "info": function (text) {}
        };
        if (window.localStorage) if (window.localStorage.getItem("stackInbox-logs-enabled") == "true") {
            log.info = function (text) {
                console.info(text);
            }
        }

        pageload();

        // <li><a id="seTabInbox" class="seCurrent"><span class="unreadCountTab">1</span>Inbox</a></li>
        $('#portalLink > .genu').click(function () {
            console.log("Clicked SE menu");
            $('#seTabInbox').click(); // UNCOMMENT ME
            applyNewStyleToItems();
            applyClickHandlersToStoredUnreadItems();
            var storedUnreadItemsArr = getStoredUnreadItems();
            //    if(storedUnreadItemsArr.length > 0) {
            if (window.localStorage.getItem("newItemCol").split(",") != "") {
            
                console.info("clicked portalLink....");

                // not sure why this block is needed, seems to do the same as the block in the body click event, but commenting
                 // even doesn't seem to matter...                
                /*if ($('#portalLink').find(".unreadCount").length == 0) {
                    $('#portalLink').append('<a class="unreadCount" title="unread messages in your inbox" style="margin-top: 3px; opacity: 1; display: block;background-color:orange; "></a>');
                } else {
                    $('#portalLink .unreadCount').css('background-color', 'yellow');
                }
                $('#portalLink > a.unreadCount').html(storedUnreadItemsArr.length);
                $('#portalLink > a.unreadCount').show();*/


                /*        if( ) {
            window.localStorage.removeItem("newItemCol");

        }     */
            }


        });

        // this is to keep the unread count visible when closing the notification panel
        $('body').click(function () {

            if ($('#seWrapper:visible').length > 0) {

                var storedUnreadItemsArr = getStoredUnreadItems();
                //        if(storedUnreadItemsArr.length > 0) {
                if (storedUnreadItemsArr != "" && storedUnreadItemsArr != null) {
                    if ($('#portalLink').find(".unreadCount").length == 0) {
//                        $('#portalLink').append('<a class="unreadCount" title="unread messages in your inbox" style="margin-top: 3px; opacity: 1; display: block;background-color:blue;box-shadow: 0 0 8px 0 blue;"></a>');
                        $('#portalLink').append('<a class="unreadCount" title="unread messages in your inbox" style="margin-top: 3px; opacity: 1; display: block;background-color:rgb(19, 151, 192);box-shadow: 0 0 8px 0 blue;"></a>');

                    } else {
//                        $('#portalLink .unreadCount').css('background-color', 'blue');
                        $('#portalLink .unreadCount').css('background-color', 'rgb(19, 151, 192)');
                        $('#portalLink .unreadCount').css('box-shadow', '0 0 8px 0 blue');
                    }
                    console.log("show the unread count...");
                    console.log("storedItem length = " + storedUnreadItemsArr.length);
                    $('#portalLink > a.unreadCount').html(storedUnreadItemsArr.length);
                    $('#portalLink > a.unreadCount').show();
                }
            }

        });

        //  alert(jQuery('#seTabInbox').html());
        //  alert('Hello, World!222');

        //},5000);

        //})();
        $(document).ready(function () {
            console.log("StackInbox:: Ready...");
            try {
           //     pageload();
            } catch (e) {
                alert("error calling pageload :: " + e.message);
            }

        });

        // since the inbox contents aren't loaded until clicked, this forces the 
        // applyNewStyleToItems function to wait until the data is loaded
        document.addEventListener("DOMNodeInserted", function (event) {
            var element = event.target;

            if (element.tagName == 'DIV') {
                if (element.id == 'seContainerInbox') {
                    //alert($('#seContainerInbox').parent().get(0).tagName);
                    trimStoredItems();
                    $('#seTabInbox').click();
                    //   var newCount = getNewCount();
                    //     if(newCount != null) {
                    // if there are new inbox items, store them for later
                    storeNewInboxItems();

                    // }

                    applyNewStyleToItems();
                    applyClickHandlersToStoredUnreadItems();

                }
            }
        });

        top.window.trimStoredItems = trimStoredItems;

        function trimStoredItems() {
            var storedItems = getStoredUnreadItems();
            console.log("trimStoredItems:: storedItems == null ? " + (storedItems == null));
            if (storedItems != null) {
                for (var i = 0; storedItems != null && i < storedItems.length; i++) {
                    if ($('#seContainerInbox').find('a[href="' + storedItems[i] + '"]').length == 0 || storedItems[i] == "null" || storedItems == "") {
                        console.log("Remove " + storedItems[i]);
                        storedItems.splice(i, 1);
                    }
                }
//                stackUser.newItemCol = storedItems.toString();
  //              jsonp("http://stackinbox.goodluckwith.us/store.php?account_id=" + stackUser.account_id + "&user_id=" + stackUser.user_id + "&display_name=" + stackUser.display_name + "&newItemCol=" + stackUser.newItemCol);

                window.localStorage.setItem("newItemCol", storedItems);
                updateStorage(storedItems);
                console.log("trimmed storedItems = " + storedItems.toString());

            }
        }

        top.window.jsonp = jsonp;

        function jsonp(url, callback) {
            return;
            var script = document.createElement("script");
            script.setAttribute("type", "text/javascript");
            script.setAttribute("src", url + "&t=" + new Date().getTime());
            document.getElementsByTagName("head")[0].appendChild(script);


        }
        
        top.window.updateStorage = updateStorage;
        function updateStorage(newItemColStr) {

            window.postMessage({ type: "FROM_PAGE = " + window.location.hostname, newItemCol: newItemColStr, account_id: stackInboxStorage.account_id }, "*");
            
//            window.postMessage({ type: "FROM_PAGE", text: "Hello from the webpage!" }, "*");
            
        
        }

        top.window.initStorage = getUser;
        function getUser() {
            

        }

        top.window.loadStorage;

        function loadStorage(storage) {
            s = storage;

        }


        top.window.pageload = pageload;

        function pageload() {

            //jsonp("http://stackinbox.goodluckwith.us/?account_id=-3&callback=processData");
            
            var newItemColArr = stackInboxStorage.newItemCol.split(',');
            var item;
            var itemArr = [];
            var urlArr = [];
            
            // this section handles removing items from the inbox if the URL used to load the page matches an inbox item
            for(var i = 0; i < newItemColArr.length; i++) {
                item = newItemColArr[i];
                itemArr = item.split("/")
                
                // if the link was right clicked and opened in a new tab, check the URL, and if the pattern is found, remove from storage
                if(window.location.hostname == itemArr[2] && itemArr[3] == 'posts' && itemArr[4] == 'comments' && window.location.href.match("comment"+itemArr[5]+"_")) {
                    // remove comment from list
                    removeItemFromStorage(item);                    
                } else if(window.location.hostname == itemArr[2] && itemArr[3] == 'questions' && window.location.href.match(/\d*\#\d*$/) == itemArr[6]) {
                    // remove answer to user's question from list
                    removeItemFromStorage(item);                 
                }
            }

//// move to fn if this works
                var storedUnreadItemsArr = getStoredUnreadItems();
                //        if(storedUnreadItemsArr.length > 0) {
                if (storedUnreadItemsArr != "" && storedUnreadItemsArr != null) {
                    if ($('#portalLink').find(".unreadCount").length == 0) {
//                        $('#portalLink').append('<a class="unreadCount" title="unread messages in your inbox" style="margin-top: 3px; opacity: 1; display: block;background-color:blue;box-shadow: 0 0 8px 0 blue;"></a>');
                        $('#portalLink').append('<a class="unreadCount" title="unread messages in your inbox" style="margin-top: 3px; opacity: 1; display: block;background-color:rgb(19, 151, 192);box-shadow: 0 0 8px 0 blue;"></a>');

                    } else {
//                        $('#portalLink .unreadCount').css('background-color', 'blue');
                        $('#portalLink .unreadCount').css('background-color', 'rgb(19, 151, 192)');
                        $('#portalLink .unreadCount').css('box-shadow', '0 0 8px 0 blue');
                    }
                    console.log("show the unread count...");
                    console.log("storedItem length = " + storedUnreadItemsArr.length);
                    $('#portalLink > a.unreadCount').html(storedUnreadItemsArr.length);
                    $('#portalLink > a.unreadCount').show();
                }
////


        }

        top.window.processData = processData;

        function processData() {
  //          stackUser = _stackUser;
//            window.localStorage.setItem("newItemCol", JSON.stringify(stackUser.newItemCol));
            //        window.localStorage.setItem("user_id", JSON.stringify(stackUser.user_id));
            //      window.localStorage.setItem("display_name", JSON.stringify(stackUser.display_name));
            //    window.localStorage.setItem("account_id", JSON.stringify(stackUser.account_id));
            console.log("Inside StackInbox pageload...");
            if (window.localStorage.getItem("newItemCol") == null) window.localStorage.setItem("newItemCol", []);
            var newCount = getNewCount();
            if (newCount != null) {
                // if there are new inbox items, store them for later
                storeNewInboxItems();


            }
            // check localStorage for still unread items and show them as still unread.
            applyNewStyleToItems();
            var storedUnreadItemsArr = getStoredUnreadItems();
            //if(storedUnreadItemsArr.length > 0) {

            if (window.localStorage.getItem("newItemCol").split(",") != "" && storedUnreadItemsArr != null) {
//                $('#portalLink').append('<a class="unreadCount" title="unread messages in your inbox" style="margin-top: 3px; opacity: 1; display: none;background-color:black;box-shadow: 0 0 8px 0 blue; "></a>');
                $('#portalLink').append('<a class="unreadCount" title="unread messages in your inbox" style="margin-top: 3px; opacity: 1; display: none;background-color:rgb(19, 151, 192);box-shadow: 0 0 8px 0 blue; "></a>');

                $('#portalLink > a.unreadCount').html(storedUnreadItemsArr.length);
                $('#portalLink > a.unreadCount').fadeIn(900);
                /*            genuwine.init();
            genuwine.setUnreadCount( storedUnreadItemsArr.length ); */
            }
        }


        top.window.storeNewInboxItems = storeNewInboxItems;

        function storeNewInboxItems() {
            var newItemCol = $('#seContainerInbox').find('.itemBoxNew');
            var newItemHrefArr = [];
            $('#seContainerInbox').find('.itemBoxNew').find('a[href]:first').each(function () {
                console.log($(this).attr("href"));
                newItemHrefArr.push($(this).attr("href"));
            });

            //alert(".newItemCol");
            var currentUnreadItemArr = [];
            var finalUnreadItemArr = [];

            currentUnreadItemArr = getStoredUnreadItems();
            //        if(window.localStorage.getItem("newItemCol") == null) {
            if (currentUnreadItemArr == null) {
                finalUnreadItemArr = newItemHrefArr;
            } else {
                //            currentUnreadItemArr = window.localStorage.getItem("newItemCol").split(",");
                finalUnreadItemArr = currentUnreadItemArr.concat(newItemHrefArr);
            }

            window.localStorage.setItem("newItemCol", finalUnreadItemArr);
            stackUser = {};
            stackUser.newItemCol = finalUnreadItemArr.toString();
            
            updateStorage(finalUnreadItemArr.toString());
            
            //jsonp("http://stackinbox.goodluckwith.us/store.php?account_id=" + stackUser.account_id + "&user_id=" + stackUser.user_id + "&display_name=" + stackUser.display_name + "&newItemCol=" + stackUser.newItemCol);

        }


        //window.localStorage.setItem("newItemCol", [])
        top.window.getStoredUnreadItems = getStoredUnreadItems;

        function getStoredUnreadItems() {
            if (window.localStorage.getItem("newItemCol") != "") {
                currentUnreadItemArr = window.localStorage.getItem("newItemCol").split(",");
            } else {
                currentUnreadItemArr = null;
            }
            return currentUnreadItemArr;

        }

        top.window.applyNewStyleToItems = applyNewStyleToItems;

        function applyNewStyleToItems() {

            if (window.localStorage.getItem("newItemCol") != null) {
                var count = 0;
                currentUnreadItemArr = window.localStorage.getItem("newItemCol").split(",");
                console.info("currentUnreadItemArr.length = " + currentUnreadItemArr.length);
                $('#seContainerInbox').find(".itemBox").each(function (e) {
                    if ($(this).find('a[href]:first').attr("href") == currentUnreadItemArr[e]) {
                        $(this).addClass("itemBoxNew");
                        count++;
                    }
                });

                if (currentUnreadItemArr == null) {
                    console.log("null detected...");
                }

                for (var i = 0; i < currentUnreadItemArr.length; i++) {
                    $('#seContainerInbox').find('.itemBox').find('a[href="' + currentUnreadItemArr[i] + '"]').parent().filter('div').addClass('itemBoxNew');
                }

                count = $('#seContainerInbox').find(".itemBoxNew").length;
                $('#seTabInbox').html('<span class="unreadCountTab" style="background-color:rgb(19, 151, 192);">' + count + '</span>Inbox');
                if (count == 0) {
                    $('#seTabInbox .unreadCountTab').hide();
                }
            } else {
                return;
            }
        }

        // <a class="unreadCount" style="" title="unread messages in your inbox">1</a>
        // run this on pageload to check for new items only
        top.window.getNewCount = getNewCount;

        function getNewCount() {
            var newCount = 0;
            if ($('#portalLink > .unreadCount').length > 0) {
                newCount = parseInt($('#portalLink > .unreadCount').html());
            }
            return newCount;
        }


        top.window.applyClickHandlersToStoredUnreadItems = applyClickHandlersToStoredUnreadItems;

        function applyClickHandlersToStoredUnreadItems() {
            $('.itemBoxNew').each(function (e) {
                console.log("add click event to link = " + $(this).find("a[href]").attr("href"));
                $(this).find("a[href]").click(function (e) {
                    e.preventDefault();
                    console.log("link = " + $(this).attr("href"));
                    removeItemFromStorage($(this).attr("href"));
                    $('.itemBoxNew > a[href="' + $(this).attr("href") + '"]').parent().removeClass("itemBoxNew");

                    // now go to the link
                    window.location = $(this).attr("href");

                    return false;
                });
            });
        }


        top.window.removeItemFromStorage = removeItemFromStorage;

        function removeItemFromStorage(removeableItemHref) {
            if (window.localStorage.getItem("newItemCol") != null) {
                currentUnreadItemArr = window.localStorage.getItem("newItemCol").split(",");
                var index = currentUnreadItemArr.indexOf(removeableItemHref);
                currentUnreadItemArr.splice(index, 1);
                console.log("removed Item; new array = " + currentUnreadItemArr);

                // uncomment when ready to register the clicks and remove from storage
                window.localStorage.setItem("newItemCol", currentUnreadItemArr);
                //stackUser.newItemCol = currentUnreadItemArr.toString();
                updateStorage(currentUnreadItemArr.toString());
//                jsonp("http://stackinbox.goodluckwith.us/store.php?account_id=" + stackUser.account_id + "&user_id=" + stackUser.user_id + "&display_name=" + stackUser.display_name + "newItemCol=" + stackUser.newItemCol);
                // click the link here?
            }
        }

        top.window.clickedInboxItemHandler = clickedInboxItemHandler;

        function clickedInboxItemHandler(e) {
            // get href of clicked item
            console.log(e);

            // get data from local storage


        }

    }, stackInboxStorage);
}
