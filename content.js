chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request === "getClickedEl") {
        sendResponse({odd: clickedEl.textContent});
    } else if (request.message === 'addCustomButton' && request.url.startsWith('https://en.surebet.com/surebet')) {
        addCustomButtonToTbodies()
    } else if (request.message === 'appendBetSlip') {
        const betJson = request.betJson; // Received bet JSON from background script
        // Call the function to update or create the bet slip
        updateBetSlip(betJson);
    }
});

function updateBetSlip(betJson) {
    const betSlipContainer = document.getElementById('betSlipContainer');

    if (betSlipContainer) {
        // Update the existing bet slip with new data
        updateBetSlipData(betJson);
    } else {
        // Create a new bet slip with updated data
        const betSlipHTML = createBetSlipForm(betJson);
        document.body.insertAdjacentHTML('beforeend', betSlipHTML);
    }
}

function updateBetSlipData(betJson) {
    const totalStakeElement = document.getElementById('totalStake');
    if (totalStakeElement) {
        totalStakeElement.textContent = betJson.totalStake;
    }

    // Update stake inputs and other data for each bookmaker
    betJson.bookmakers.forEach((bookmaker, index) => {
        const oddsInput = document.getElementById(`odds${index}`);
        const stakeInput = document.getElementById(`stake${index}`);

        if (oddsInput) {
            oddsInput.value = bookmaker.odds || '';
        }
        if (stakeInput) {
            stakeInput.value = bookmaker.stake || '';
        }
    });
}

function createBetSlipForm(betJson) {
    let bookmakersForm = '';

    // Generate form fields for each bookmaker
    betJson.bookmakers.forEach((bookmaker, index) => {
        const bookmakerClass = bookmaker.name.replace(/\s+/g, '-').toLowerCase(); // Creating a class based on the bookmaker's name

        bookmakersForm += `
             <div class="bookmaker ${bookmakerClass}">
                <h3>Bookmaker ${index + 1} - ${bookmaker.name}</h3>
                <p class="market-type">Market Type: ${bookmaker.marketType}</p>
                <label class="styled-label" for="odds${index}">Odds:</label>
                <input class="odds-input" type="text" id="odds${index}" data-bookmaker-index="${index}" value="${bookmaker.odds}">
                <br>
                <label class="styled-label" for="stake${index}">Stake:</label>
                <input class="stake-input" type="text" id="stake${index}" data-bookmaker-index="${index}" value="${bookmaker.stake || ''}" placeholder="Enter stake...">
            </div>
            <hr class="divider">
        `;
    });

    // Wrap the form in a container div with scrollable content and fixed position
    const formHTML = `
        <style>
            /* Your updated CSS styles */
            #betSlipContainer {
                position: fixed;
                bottom: 0;
                left: 0;
                background-color: #333; /* Dark background */
                color: #fff; /* Light text */
                border: 1px solid #555;
                padding: 10px;
                height: 400px;
                width: 300px; /* Default width */
                overflow-y: auto;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                font-family: Arial, sans-serif; /* Consistent font */
                text-align: left; /* Align text to the left */
            }
            .bookmaker {
                margin-bottom: 20px;
            }
            .bookmaker h3 {
                margin-top: 0;
                font-size: 18px;
            }
            .market-type {
                margin-top: 5px;
                margin-bottom: 10px;
                font-style: italic;
            }
            label {
                display: block;
                font-weight: bold;
                margin-bottom: 5px;
                color: #aaa; /* Lighter label text */
            }
            input[type="text"] {
                width: calc(100% - 12px);
                padding: 6px;
                margin-bottom: 10px;
                border: 1px solid #555;
                background-color: #444; /* Darker input background */
                color: #fff; /* Light text */
            }
            .divider {
                margin: 20px 0;
                border-color: #555;
            }
            #totalStake,
            #placeBetButton {
                width: calc(50% - 6px);
                padding: 6px;
                margin-bottom: 10px;
                border: 1px solid #555;
                background-color: #444; /* Darker button background */
            }
            #placeBetButton {
                background-color: #00B073; /* Green button */
                color: #fff; /* Light text */
                cursor: pointer;
                border: none;
            }
            
            .styled-label {
                color: #00B073;
                font-size: 0.75rem;
                text-transform: uppercase;
                font-weight: 400;
                padding: 5px 0 10px;
            }
        </style>
        <div id="betSlipContainer">
            <h2>Bet Slip</h2>
            ${bookmakersForm}
            <div class="row">
                <p id="totalStake">${betJson.totalStake}</p>
                <button id="placeBetButton">Place Bet</button>
            </div>
        </div>
    `;
    return formHTML;
}

// Add event listener to calculate total stake on stake input change
document.addEventListener('input', function (event) {
    if (event.target.classList.contains('stake-input')) {
        const stake = parseFloat(event.target.value) || 0;
        const bookmakerIndex = event.target.dataset.bookmakerIndex;
        chrome.runtime.sendMessage({message: 'inputStakeUpdated', bookmakerIndex, stake});
    }
});

// Function to extract information from the selected table row
function extractTableInfo(row) {
    const profit = row.querySelector('.profit').textContent.trim();
    const age = row.querySelector('.age').textContent.trim();

    const bookmakers = [];
    const bookmakerRows = row.querySelectorAll('.surebet_record > tr');
    bookmakerRows.forEach((bookmakerRow) => {
        const bookerLink = bookmakerRow.querySelector('.booker a');
        if (bookerLink) {
            const bookmaker = {
                name: bookmakerRow.querySelector('.booker a').textContent.trim(),
                sport: bookmakerRow.querySelector('.booker .minor').textContent.trim(),
                event: bookmakerRow.querySelector('.event a').textContent.trim(),
                url: 'https://en.surebet.com' + bookmakerRow.querySelector('.event a').getAttribute('href'),
                odds: bookmakerRow.querySelector('.value a').textContent.trim(),
                marketType: bookmakerRow.querySelector('.coeff abbr').getAttribute('title').trim() // Extract market type
                // limit: bookmakerRow.querySelector('.value .limit').textContent.trim()
            };
            bookmakers.push(bookmaker);
        }
    });

    const extractedData = {
        profit: profit,
        age: age,
        bookmakers: bookmakers
    };
    return extractedData;
}

// Function to handle button click
function handleButtonClick(event) {
    const tableRow = event.target.closest('tr'); // Find the closest table row
    if (tableRow) {
        const surebetRecord = tableRow.closest('.surebet_record');
        if (surebetRecord) {
            var extractedEvent = extractTableInfo(surebetRecord)
            chrome.runtime.sendMessage({message: 'openBetSlip', betJson: extractedEvent});

        }
    }
}


function addCustomButtonToTbodies() {
    // Find all tbody elements with class 'surebet_record'
    const tbodyElements = document.querySelectorAll('tbody.surebet_record');

// Iterate through each tbody element
    tbodyElements.forEach((tbody) => {
        // Create a new row (tr)
        const customRow = document.createElement('tr');

        const customButton = document.createElement('button');
        customButton.textContent = 'Open Bet';

// Apply inline styles to the button
        customButton.style.backgroundColor = '#3498db';
        customButton.style.color = 'white';
        customButton.style.border = 'none';
        customButton.style.padding = '10px 20px';
        customButton.style.textAlign = 'center';
        customButton.style.textDecoration = 'none';
        customButton.style.display = 'inline-block';
        customButton.style.fontSize = '16px';
        customButton.style.margin = '4px 2px';
        customButton.style.cursor = 'pointer';
        customButton.addEventListener('click', handleButtonClick);

        // Append the button to the new row
        const td = document.createElement('td');
        td.appendChild(customButton);
        customRow.appendChild(td);

        // Add the new row (tr) at the end of the tbody
        tbody.appendChild(customRow);
    });
}


function getSelectedOdd(info, tab) {
    chrome.runtime.sendMessage({
        websiteName: "Website Name", // Replace with the actual website name
        selectedOdd: info.selectionText
    });
}

var clickedEl = null;

document.addEventListener("contextmenu", function (event) {
    clickedEl = event.target;
}, true);

function observeElementChanges(element) {
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'characterData' || mutation.type === 'childList') {
                chrome.runtime.sendMessage({type: 'elementTextChanged', text: element.textContent});
            }
        });
    });

    observer.observe(element, {subtree: true, characterData: true, childList: true});
}

window.addEventListener("contextmenu",
    function (e) {
        e.stopPropagation()
    }, true);
