let openedTabs = []; // Track IDs of opened tabs
let betJson = null

async function getBetJson() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get('betJson', function (result) {
            betJson = result.betJson || {}; // If betJson is not found, default to an empty object
            resolve(betJson);
        });
    });
}

async function setBetJson(betJsonData) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({'betJson': betJsonData}, function () {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                betJson=betJsonData
                resolve(betJson);
            }
        });
    });
}

// Triggering the content script from popup or background script
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
        const tabURL = tab.url;
        chrome.tabs.sendMessage(tabId, {message: 'addCustomButton', url: tabURL});
    }
    const matchingTab = openedTabs.find(openedTab => openedTab.tabId === tabId);

    if (matchingTab && changeInfo.status === 'complete') {
        if (!matchingTab.betJson || Object.keys(matchingTab.betJson).length === 0) {
            return; // Exit if the request.betJson is empty or undefined
        }

        var betJson = matchingTab.betJson;
        await setBetJson(betJson)
        chrome.contextMenus.removeAll(() => {
            // Create a new context menu for bookmakers
            chrome.contextMenus.create({
                id: "selectBookmakerSlip",
                title: "Select Bookmaker Slip",
                contexts: ["all"]
            });

            // Create sub-menu items for each bookmaker
            betJson.bookmakers.forEach((bookmaker, index) => {
                chrome.contextMenus.create({
                    id: `bookmaker${index}`,
                    parentId: "selectBookmakerSlip",
                    title: bookmaker.name,
                    contexts: ["all"],
                });
            });
        });
        chrome.tabs.sendMessage(tabId, {message: 'appendBetSlip', betJson});
    }
});
let current

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.message === 'addCustomButton' && request.url.startsWith('https://en.surebet.com/surebet')) {
        chrome.tabs.sendMessage(currentTab.id, {message: 'addCustomButton', url: tabURL});
    } else if (request.message === 'openBetSlip') {
        const betJson = request.betJson;
        const urlsToOpen = betJson.bookmakers.map(bookmaker => bookmaker.url);

        urlsToOpen.forEach(url => {
            chrome.tabs.create({url, active: false}, tab => {
                openedTabs.push({tabId: tab.id, betJson: betJson}); // Track the IDs of newly opened tabs
            });
        });
    } else if (request.message === 'inputStakeUpdated') {
        const {bookmakerIndex, stake} = request;

        try {
            const betJson = await getBetJson();
            betJson.bookmakers[bookmakerIndex].stake = stake;

            // Recalculate the total stake based on all bookmakers' stakes
            betJson.totalStake = betJson.bookmakers.reduce((total, bookmaker) => {
                return total + (parseFloat(bookmaker.stake) || 0);
            }, 0);
            await setBetJson(betJson)

            // Broadcast the updated betJson to all opened tabs
            openedTabs.forEach(openedTab => {
                const {tabId} = openedTab;
                chrome.tabs.sendMessage(tabId, {message: 'appendBetSlip', betJson});
            });

        } catch (error) {
            console.error('Error retrieving betJson:', error);
        }
    }
});


chrome.contextMenus.onClicked.addListener(
    (info, tab) => {
        console.log("item clicked");
        let rateKey = info.menuItemId.split("to");
        makeExchange(rateKey, info)
    }
);
chrome.contextMenus.onClicked.addListener(
    (info, tab) => {
        chrome.tabs.sendMessage(tab.id, "getClickedEl", {frameId: info.frameId}, data => {
            elt.value = data.odd;
        });
    }
);

