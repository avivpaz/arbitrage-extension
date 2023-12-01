document.addEventListener('DOMContentLoaded', function () {
    // var link = document.getElementById('addBookmaker');
    // link.addEventListener('click', function () {
    //     addBookmaker();
    // });
    document.addEventListener('click', function (event) {
        if (event.target.classList.contains('remove')) {
            removeBookmaker(event.target);
        }
    });


// Event listener for the save button click
    const saveButton = document.getElementById('saveButton');
    saveButton.addEventListener('click', saveBetDetails);

    checkBookmakersPresence();


});


// Function to check bookmakers presence and display default input if not present
function checkBookmakersPresence() {
    const bookmakersContainer = document.getElementById('bookmakersContainer');
    const bookmakers = bookmakersContainer.querySelectorAll('.bookmaker');

    if (bookmakers.length === 0) {
        // Show the input for pasting text structure
        addDefaultInput(bookmakersContainer);
    }
}

// Function to add default input for pasting text structure
function addDefaultInput(container) {
    const defaultInputDiv = document.createElement('div');
    defaultInputDiv.innerHTML = `
        <label for="pastedText">Paste Text Structure:</label>
        <textarea id="pastedText" class="pastedText" rows="10" cols="50"></textarea>
        <button id="populateButton">Load Bet</button>
    `;
    container.appendChild(defaultInputDiv);
    // Add event listener to the "Populate From Text" button
    const populateButton = document.getElementById('populateButton');
    const saveButton = document.getElementById('saveButton');

    populateButton.addEventListener('click', function () {
        populateFromPastedText();
        populateButton.style.display = 'none'; // Hide the "Create Bet" button
        saveButton.style.display = 'block'; // Show the "Save Bet" button
    });
}

// Custom formatting to maintain the same UTC time
const formatDate = (date) => {
    const year = date.getUTCFullYear();
    const month = `0${date.getMonth() + 1}`.slice(-2);
    const day = `0${date.getDate()}`.slice(-2);
    const hours = `0${date.getHours()}`.slice(-2);
    const minutes = `0${date.getMinutes()}`.slice(-2);
    const seconds = `0${date.getSeconds()}`.slice(-2);

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

function populateFromPastedText() {
    const pastedText = document.getElementById('pastedText').value;

    // Split the pasted text by lines
    const lines = pastedText.split('\n').filter(line => line.trim().length > 0);

    // Extract general bet details from the first line
    const [rawDate, gameName, leagueName] = lines[0].split('\t').filter(Boolean);
    const formattedDate = new Date(rawDate);
    const gameDate = formatDate(formattedDate);

    // Extract expected profit from the last line
    const lastLineData = lines[lines.length - 3].split('\t').filter(Boolean);
    const expectedProfitPercentage = lastLineData[lastLineData.length - 1].replace('%', '');
    const expectedProfit = parseFloat(expectedProfitPercentage / 100).toFixed(4);

    // Clear existing bookmakers
    const bookmakersContainer = document.getElementById('bookmakersContainer');
    bookmakersContainer.innerHTML = '';

    // Create and append the general bet details before bookmakers
    const generalDetailsDiv = document.createElement('div');
    generalDetailsDiv.classList.add('generalDetails');
    generalDetailsDiv.innerHTML = `
        <label for="gameName">Game Name:</label>
        <input type="text" id="gameName" name="gameName" value="${gameName}">
        <label for="gameDate">Game Date:</label>
        <input type="text" id="gameDate" name="gameDate" value="${gameDate}">
        <label for="leagueName">League Name:</label>
        <input type="text" id="leagueName" name="leagueName" value="${leagueName}">
        <label for="expectedProfit">Expected Profit:</label>
        <input type="text" id="expectedProfit" name="expectedProfit" value="${expectedProfit}">
    `;
    bookmakersContainer.appendChild(generalDetailsDiv);

    // Iterate through lines starting from the second line (bookmaker entries)
    for (let i = 1; i < lines.length - 1; i++) {
        const data = lines[i].split('\t').filter(Boolean);
        const [bookmaker, marketType, odd, , , stake, backerStake] = data;

        if (data.length >= 6) {
            addBookmaker(bookmaker, marketType, odd, stake, backerStake);
        }
    }
}


// Function to add a new bookmaker entry
function addBookmaker(bookmaker = null, marketType = null, odd = null, stake = null, backerStake = null) {
    const bookmakersContainer = document.getElementById('bookmakersContainer');
    const bookmakerDiv = document.createElement('div');
    bookmakerDiv.classList.add('bookmaker');
    bookmakerDiv.innerHTML = `
        <label for="bookmakerName">Bookmaker Name:</label>
        <select class="bookmakerName" name="bookmakerName[]">
            <!-- Options populated from API will appear here -->
        </select>
        <label for="bookmakerMarket">Market Type:</label>
        <input type="text" class="bookmakerMarket" name="bookmakerMarket[]" value="${marketType}">
        <label for="bookmakerBet">Bet Type:</label>
        <select class="bookmakerBet" name="bookmakerBet[]"></select>
        <label for="bookmakerDeposit">Deposit:</label>
        <input type="number" step="0.01" class="bookmakerDeposit" name="bookmakerDeposit[]">
        <label for="bookmakerOdd">Odd:</label>
        <input type="number" step="0.01" class="bookmakerOdd" name="bookmakerOdd[]" value="${odd}">
        <label for="bookmakerStake">Stake:</label>
        <input type="number" step="0.01" class="bookmakerStake" name="bookmakerStake[]" value="${stake}">
    `;
    bookmakersContainer.appendChild(bookmakerDiv);

    // Function to normalize strings (remove accents and normalize case)
    function normalizeString(string) {
        return string.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '').toLowerCase();
    }

    // Set the initial bet type based on the market type
    const betType = /lay/i.test(marketType) ? 'Lay' : 'Back';

    // Fetch data from the API for the bookmakers dropdown
    fetch('https://api.arbs.site/bookmakers')
        .then(response => response.json())
        .then(data => {
            const bookmakerDropdown = bookmakerDiv.querySelector('.bookmakerName');
            data.forEach(apiBookmaker => {
                const option = document.createElement('option');
                option.value = apiBookmaker.id; // Setting bookmaker ID as the option value
                option.textContent = apiBookmaker.name;

                // If the bookmaker passed to the function matches, set it as selected
                if (apiBookmaker.surebetName === bookmaker) {
                    option.selected = true;
                }

                bookmakerDropdown.appendChild(option);
            });

            // Populate the bet type dropdown with the determined value
            const betTypeDropdown = bookmakerDiv.querySelector('.bookmakerBet');
            const betOptions = ['Back', 'Lay'];
            betOptions.forEach(option => {
                const betOption = document.createElement('option');
                betOption.value = option;
                betOption.textContent = option;

                // If the bet type matches, set it as selected
                if (normalizeString(option) === normalizeString(betType)) {
                    betOption.selected = true;
                    if (betOption.value === 'Lay') {
                        const backerStakeInput = document.createElement('input');
                        backerStakeInput.type = 'text';
                        backerStakeInput.name = 'bookmakerBackerStake';
                        backerStakeInput.className = 'bookmakerBackerStake';
                        backerStakeInput.value = backerStake;

                        const backerStakeLabel = document.createElement('label');
                        backerStakeLabel.htmlFor = 'backerStake';
                        backerStakeLabel.textContent = 'Backer Stake:';

                        bookmakerDiv.appendChild(backerStakeLabel);
                        bookmakerDiv.appendChild(backerStakeInput);
                    }
                }


                betTypeDropdown.appendChild(betOption);
            });
            const remove = document.createElement('span');
            remove.className = 'remove';
            remove.textContent = 'Remove';
            bookmakerDiv.appendChild(remove);

        })
        .catch(error => {
            console.error('Error fetching bookmakers:', error);
        });
}

// Function to remove a bookmaker entry
function removeBookmaker(element) {
    const bookmakerDiv = element.parentElement;
    bookmakerDiv.remove();
}

// Function to remove a bookmaker entry
function removeBookmaker(element) {
    const bookmakerDiv = element.parentElement;
    bookmakerDiv.remove();
}


// Function to collect bet details from the form
function collectBetDetails() {
    const gameName = document.getElementById('gameName').value;
    const gameDate = document.getElementById('gameDate').value;
    const leagueName = document.getElementById('leagueName').value;
    const expectedProfit = document.getElementById('expectedProfit').value;

    // Collect bookmaker details
    const bookmakers = [];
    const bookmakerDivs = document.querySelectorAll('.bookmaker');
    bookmakerDivs.forEach(bookmakerDiv => {
        const bookmakerId = bookmakerDiv.querySelector('.bookmakerName').value;
        const marketType = bookmakerDiv.querySelector('.bookmakerMarket').value;
        const deposit = bookmakerDiv.querySelector('.bookmakerDeposit').value;
        const odd = bookmakerDiv.querySelector('.bookmakerOdd').value;
        const stake = bookmakerDiv.querySelector('.bookmakerStake').value;
        const betType = bookmakerDiv.querySelector('.bookmakerBet').value; // Updated to dropdown value
        const backerStakeElement = bookmakerDiv.querySelector('.bookmakerBackerStake'); // Updated to dropdown value
        const liability = betType === 'Lay' ? stake : null;
        var bookmaker = {bookmakerId, marketType, odd, stake, betType};
        if (backerStakeElement) {
            bookmaker.backerStake = backerStakeElement.value;
        }
        if (liability) {
            bookmaker.liability = liability;
        }
        if (deposit) {
            bookmaker.deposit = deposit;
        }
        bookmakers.push(bookmaker);
    });

    return {gameName, gameDate, leagueName, expectedProfit, bookmakers};
}

// Function to send the bet details to the API
function saveBetDetails() {
    const betDetails = collectBetDetails();

    // Show loader while processing the request
    showLoader();
    const saveButton = document.getElementById('saveButton');
    saveButton.style.display = 'none';
    fetch('https://api.arbs.site/bets', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(betDetails),
    })
        .then(response => response.json())
        .then(data => {
            // Hide loader when the request is complete
            hideLoader();

            if (data.betId) {
                console.log('Bet saved successfully. Bet ID:', data.betId);
                // Reset the form or show the initial state
                resetForm(); // Implement a function to reset the form
            } else {
                console.error('Error saving bet. No bet ID received.');
            }
        })
        .catch(error => {
            hideLoader();
            console.error('Error saving bet:', error);
        });
}


// Function to show loader
function showLoader() {
    // Create a loader element or display a loading spinner
    const loader = document.getElementById('loader');
    loader.style.display = 'block';
    // Add styling or spinner logic to the loader element as needed

}

// Function to hide loader
function hideLoader() {
    // Find and remove the loader element
    const loader = document.getElementById('loader');
    loader.style.display = 'none';
}

