// ==UserScript==
// @name          StackInbox 
// @namespace     StackInbox
// @description   Keeps unread items highlighted in the Stack Exchange inbox until each item is read.
// @copyright     2012, James Mortensen (http://stackoverflow.com/users/552792/jmort253) 
// @license       BSD License
// @version       0.0.2
//
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

// injects script into the http context
function with_jquery(f, data) {
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.textContent = "(" + f.toString() + ")(jQuery, " + JSON.stringify(data)+ ")";
    document.body.appendChild(script);
};



window.addEventListener("load", function() { 

    // hook to deal with pageloads for chat messages from the inbox
    // TODO: Yet to be implemented due to unknown method to determine current user in transcript page
    if(window.location.hostname == "chat.stackexchange.com") {
    
        var displayName = $('.mention').html().toString().substring(1);
        var url = window.location.href.toString();
           
        return;
    }

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

    // assume computer may be used by more than one SE user, so get user's accountId from display name
    getAccountIdFromStorage({"site" : site, "userId" : userId, "displayName" : displayName }, injectScriptInSE);

 });



function getAccountIdFromStorage(siteUser, injectScript) {

    console.info("userId = " + siteUser.userId + " : display Name = " + siteUser.displayName + " : site = " + siteUser.site);

    // get Chrome Extension storage
    chrome.storage.local.get(null, (function(injectScript) {
      return function(storage) {
        m_storage = storage;
        var accounts = storage.accounts;
        if(accounts) { 
            // accountId identifies the user on any SE site
            var accountId = accounts[siteUser.site+"-"+siteUser.userId];
            if(!accountId) {
                // if data for this site+userId not found, get the information from the SE API
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

// This is used in development only to avoid hitting the quotas on the APIs
  // if you're doing development on this script, replace with your data from the API
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

// get the accountId for the user from the API, and store it
function getDataFromApi(siteUser, storage, injectScript) {  

    // for testing to avoid killing the SE API! Uncomment when developing/debugging
//    getDataFromApiTest(siteUser, storage, injectScript); return;
    
    console.info("get data from api");
    
    // get account id
    xhr = new XMLHttpRequest();
    xhr.onreadystatechange = (function(siteUser, storage, injectScript) { 
        return function() {
            getAccountId(siteUser, storage, injectScript);
        }
    })(siteUser, storage, injectScript);  // Implemented elsewhere.

    console.info("make request to " + "https://api.stackexchange.com/2.1/users?order=desc&sort=reputation&inname="+siteUser.displayName+"&site="+siteUser.site+"&filter=!*MxJcsxUhQG*kL8D");
    xhr.open("GET", "https://api.stackexchange.com/2.1/users?order=desc&sort=reputation&inname="+siteUser.displayName+"&site="+siteUser.site+"&filter=!*MxJcsxUhQG*kL8D", true);
    xhr.send();    
    
}

// get the accountId from the API response
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

        // storing the accountId with the site+userId combo for future pageloads and to avoid hitting the API needlessly
        chrome.storage.local.set(storage, function() {
               console.info("accounts data stored...");
	       chrome.storage.local.get(null, function(s) {
	           console.info("this is stored = " + JSON.stringify(s));
	       });
        });
    }

}


// receive message from page context
window.addEventListener("message", function(event) { 
    console.info("data received = " + JSON.stringify(event.data));
    
    m_storage.stackInbox["account-" + event.data.account_id] = {"newItemCol" : event.data.newItemCol, "account_id" : event.data.account_id };
    
    chrome.storage.local.set(m_storage, function() { } );
    
    chrome.storage.local.get(null, function(ssss) { 
        console.info("After storing data, we now have = " + JSON.stringify(ssss));
    } );

}, false);


// take the storage and pass relevant data and business logic into the page context
function injectScriptInSE(stackInboxStorage) {
    /**
      This is code added to the page context.
    */
    with_jquery(function ($, stackInboxStorage) {

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
                if (storedUnreadItemsArr != "" && storedUnreadItemsArr != null) {
                    if ($('#portalLink').find(".unreadCount").length == 0) {

                        // add the unread count bubble to the inbox
                        $('#portalLink').append('<a class="unreadCount" title="unread messages in your inbox" style="margin-top: 3px; opacity: 1; display: block;background-color:rgb(19, 151, 192);box-shadow: 0 0 8px 0 blue;"></a>');

                    } else {
                        // bubble already present, so just change the colors
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


        // since the inbox contents aren't loaded until clicked, this forces the 
        // applyNewStyleToItems function to wait until the data is loaded
        // TODO: There's a better way to do this and listen for DOM changes
        document.addEventListener("DOMNodeInserted", function (event) {
            var element = event.target;

            if (element.tagName == 'DIV') {
                if (element.id == 'seContainerInbox') {
                    //console.info($('#seContainerInbox').parent().get(0).tagName);
                    trimStoredItems();
                    $('#seTabInbox').click();

                    // if there are new inbox items, store them for later
                    storeNewInboxItems();

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

                window.localStorage.setItem("newItemCol", storedItems);
                updateStorage(storedItems);
                console.log("trimmed storedItems = " + storedItems.toString());

            }
        }


        // for cross domain json requests. 
        // TODO: This is currently unused. Remove if determined to not be needed
        top.window.jsonp = jsonp;
        function jsonp(url, callback) {
            return;
            var script = document.createElement("script");
            script.setAttribute("type", "text/javascript");
            script.setAttribute("src", url + "&t=" + new Date().getTime());
            document.getElementsByTagName("head")[0].appendChild(script);

        }
        

        // update the Chrome Extension storage by passing the data, with accountId, back to the background process to be stored.        
        top.window.updateStorage = updateStorage;
        function updateStorage(newItemColStr) {

            window.postMessage({ type: "FROM_PAGE = " + window.location.hostname, newItemCol: newItemColStr, account_id: stackInboxStorage.account_id }, "*");

        }


        // runs in the page context to deploy business logic
        top.window.pageload = pageload;
        function pageload() {
            
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

                // TODO: consider moving to separate function, if reusable to avoid duplicate code
                    // as there is another section that is similar to this!
                var storedUnreadItemsArr = getStoredUnreadItems();
                //        if(storedUnreadItemsArr.length > 0) {
                if (storedUnreadItemsArr != "" && storedUnreadItemsArr != null) {
                    if ($('#portalLink').find(".unreadCount").length == 0) {

                        $('#portalLink').append('<a class="unreadCount" title="unread messages in your inbox" style="margin-top: 3px; opacity: 1; display: block;background-color:rgb(19, 151, 192);box-shadow: 0 0 8px 0 blue;"></a>');

                    } else {

                        $('#portalLink .unreadCount').css('background-color', 'rgb(19, 151, 192)');
                        $('#portalLink .unreadCount').css('box-shadow', '0 0 8px 0 blue');
                    }
                    console.log("show the unread count...");
                    console.log("storedItem length = " + storedUnreadItemsArr.length);
                    $('#portalLink > a.unreadCount').html(storedUnreadItemsArr.length);
                    $('#portalLink > a.unreadCount').show();
                }
                //// end TODO


        }

        top.window.processData = processData;
        function processData() {

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

            if (window.localStorage.getItem("newItemCol").split(",") != "" && storedUnreadItemsArr != null) {

                $('#portalLink').append('<a class="unreadCount" title="unread messages in your inbox" style="margin-top: 3px; opacity: 1; display: none;background-color:rgb(19, 151, 192);box-shadow: 0 0 8px 0 blue; "></a>');

                $('#portalLink > a.unreadCount').html(storedUnreadItemsArr.length);
                $('#portalLink > a.unreadCount').fadeIn(900);

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

            //console.info(".newItemCol");
            var currentUnreadItemArr = [];
            var finalUnreadItemArr = [];

            currentUnreadItemArr = getStoredUnreadItems();

            if (currentUnreadItemArr == null) {
                finalUnreadItemArr = newItemHrefArr;
            } else {

                finalUnreadItemArr = currentUnreadItemArr.concat(newItemHrefArr);
            }

            window.localStorage.setItem("newItemCol", finalUnreadItemArr);
            stackUser = {};
            stackUser.newItemCol = finalUnreadItemArr.toString();
    
            // make sure updates are stored        
            updateStorage(finalUnreadItemArr.toString());
        }



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


        // run this on pageload to check for new items only
        top.window.getNewCount = getNewCount;
        function getNewCount() {
            var newCount = 0;
            if ($('#portalLink > .unreadCount').length > 0) {
                newCount = parseInt($('#portalLink > .unreadCount').html());
            }
            return newCount;
        }


        // when an inbox item is clicked, we remove it from storage, update the background process, then visit the link
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


        // remove item from storage, and update background process storage
        top.window.removeItemFromStorage = removeItemFromStorage;
        function removeItemFromStorage(removeableItemHref) {
            if (window.localStorage.getItem("newItemCol") != null) {
                currentUnreadItemArr = window.localStorage.getItem("newItemCol").split(",");
                var index = currentUnreadItemArr.indexOf(removeableItemHref);
                currentUnreadItemArr.splice(index, 1);
                console.log("removed Item; new array = " + currentUnreadItemArr);

                // uncomment when ready to register the clicks and remove from storage
                window.localStorage.setItem("newItemCol", currentUnreadItemArr);

                // pass updates to storage in the background process
                updateStorage(currentUnreadItemArr.toString());
            }
        }


    }, stackInboxStorage);
}
