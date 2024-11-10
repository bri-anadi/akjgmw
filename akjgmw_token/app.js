// app.js

// Initialize Lucide icons
lucide.createIcons();

// Contract Configuration
let contractABI;
let contractAddress;

// State variables
let web3;
let contract;
let account;
let isOwner = false;
let isPaused = false;

// Load Contract Data from JSON
async function loadContractData() {
    try {
        const response = await fetch('abi.json');
        const data = await response.json();
        contractABI = data.abi;
        contractAddress = data.contractAddress;
        return true;
    } catch (error) {
        console.error('Error loading contract data:', error);
        showError('Failed to load contract configuration');
        return false;
    }
}

// Loading Overlay Management
const showLoading = () => {
    document.getElementById('loadingOverlay').classList.remove('hidden');
};

const hideLoading = () => {
    document.getElementById('loadingOverlay').classList.add('hidden');
};

// Initialize Web3
async function init() {
    showLoading();
    // First load the contract data
    const success = await loadContractData();
    if (!success) {
        hideLoading();
        return;
    }

    if (typeof window.ethereum !== 'undefined') {
        try {
            // Request account access
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            account = accounts[0];
            updateAccountDisplay(account);

            web3 = new Web3(window.ethereum);
            contract = new web3.eth.Contract(contractABI, contractAddress);

            // Load initial contract state
            await loadContractState();

            // Set up event listeners
            setupEventListeners();

            // Listen for account changes
            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', () => window.location.reload());

            // Setup contract events
            setupContractEvents();

            hideLoading();
        } catch (error) {
            hideLoading();
            showError('Failed to load Web3: ' + error.message);
        }
    } else {
        hideLoading();
        showError('Please install MetaMask to use this dApp');
    }
}

function updateAccountDisplay(address) {
    const displayAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    document.getElementById('accountAddress').textContent = displayAddress;
}

async function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        showError('Please connect to MetaMask.');
    } else if (accounts[0] !== account) {
        account = accounts[0];
        updateAccountDisplay(account);
        await loadContractState();
    }
}

async function loadContractState() {
    try {
        showLoading();
        const [
            balanceResult,
            totalSupplyResult,
            maxSupplyResult,
            ownerResult,
            pausedResult
        ] = await Promise.all([
            contract.methods.balanceOf(account).call(),
            contract.methods.totalSupply().call(),
            contract.methods.maxSupply().call(),
            contract.methods.owner().call(),
            contract.methods.paused().call()
        ]);

        // Update UI with formatted values
        document.getElementById('balance').textContent = formatAmount(balanceResult);
        document.getElementById('totalSupply').textContent = formatAmount(totalSupplyResult);
        document.getElementById('maxSupply').textContent = formatAmount(maxSupplyResult);

        isOwner = ownerResult.toLowerCase() === account.toLowerCase();
        isPaused = pausedResult;

        // Show/hide owner functions
        document.getElementById('ownerFunctions').style.display = isOwner ? 'block' : 'none';

        // Update pause button
        if (isOwner) {
            updatePauseButton();
        }

        // Update disabled states
        updateDisabledStates();
        hideLoading();
    } catch (error) {
        hideLoading();
        showError('Error loading contract state: ' + error.message);
    }
}

function formatAmount(amount) {
    return parseFloat(web3.utils.fromWei(amount)).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6
    });
}

function updatePauseButton() {
    const button = document.getElementById('pauseButton');
    const icon = isPaused ? 'play' : 'pause';
    const text = isPaused ? 'Unpause Contract' : 'Pause Contract';
    button.innerHTML = `
        <i data-lucide="${icon}" class="w-4 h-4"></i>
        <span>${text}</span>
    `;
    lucide.createIcons();
}

function setupEventListeners() {
    // Transfer
    document.getElementById('transferButton').addEventListener('click', handleTransfer);

    // Mint (Owner only)
    if (isOwner) {
        document.getElementById('mintButton').addEventListener('click', handleMint);
        document.getElementById('pauseButton').addEventListener('click', handlePauseToggle);
    }

    // Burn
    document.getElementById('burnButton').addEventListener('click', handleBurn);

    // Input validation
    setupInputValidation();
}

function setupInputValidation() {
    const numberInputs = document.querySelectorAll('input[type="number"]');
    numberInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            if (e.target.value < 0) e.target.value = 0;
        });
    });
}

async function handleTransfer() {
    const to = document.getElementById('transferTo').value;
    const amount = document.getElementById('transferAmount').value;

    if (!to || !amount) {
        showError('Please fill in all fields');
        return;
    }

    try {
        showLoading();
        await contract.methods.transfer(to, web3.utils.toWei(amount))
            .send({ from: account });

        showSuccess('Transfer successful!');
        await loadContractState();
        clearInputs(['transferTo', 'transferAmount']);
    } catch (error) {
        showError('Transfer failed: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function handleMint() {
    const to = document.getElementById('mintAddress').value;
    const amount = document.getElementById('mintAmount').value;

    if (!to || !amount) {
        showError('Please fill in all fields');
        return;
    }

    try {
        showLoading();
        await contract.methods.mint(to, web3.utils.toWei(amount))
            .send({ from: account });

        showSuccess('Tokens minted successfully!');
        await loadContractState();
        clearInputs(['mintAddress', 'mintAmount']);
    } catch (error) {
        showError('Minting failed: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function handlePauseToggle() {
    try {
        showLoading();
        if (isPaused) {
            await contract.methods.unpause().send({ from: account });
        } else {
            await contract.methods.pause().send({ from: account });
        }

        showSuccess(`Contract ${isPaused ? 'unpaused' : 'paused'} successfully!`);
        await loadContractState();
    } catch (error) {
        showError('Failed to toggle pause: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function handleBurn() {
    const amount = document.getElementById('burnAmount').value;

    if (!amount) {
        showError('Please enter amount to burn');
        return;
    }

    try {
        showLoading();
        await contract.methods.burn(web3.utils.toWei(amount))
            .send({ from: account });

        showSuccess('Tokens burned successfully!');
        await loadContractState();
        clearInputs(['burnAmount']);
    } catch (error) {
        showError('Burning failed: ' + error.message);
    } finally {
        hideLoading();
    }
}

function updateDisabledStates() {
    const transferBtn = document.getElementById('transferButton');
    const burnBtn = document.getElementById('burnButton');

    transferBtn.disabled = isPaused;
    burnBtn.disabled = isPaused;

    [transferBtn, burnBtn].forEach(btn => {
        if (isPaused) {
            btn.classList.add('bg-gray-400', 'dark:bg-dark-300');
            btn.classList.remove('hover:bg-blue-600', 'hover:bg-red-600');
        } else {
            btn.classList.remove('bg-gray-400', 'dark:bg-dark-300');
            btn.classList.add('hover:bg-blue-600', 'hover:bg-red-600');
        }
    });
}

function showError(message) {
    const alert = document.getElementById('errorAlert');
    const messageElement = document.getElementById('errorMessage');
    messageElement.textContent = message;
    alert.classList.remove('hidden');
    setTimeout(() => alert.classList.add('hidden'), 5000);
}

function showSuccess(message) {
    const alert = document.getElementById('successAlert');
    const messageElement = document.getElementById('successMessage');
    messageElement.textContent = message;
    alert.classList.remove('hidden');
    setTimeout(() => alert.classList.add('hidden'), 5000);
}

function clearInputs(ids) {
    ids.forEach(id => {
        document.getElementById(id).value = '';
    });
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    init();
});

// Contract Events
const setupContractEvents = () => {
    contract.events.Transfer({ fromBlock: 'latest' })
        .on('data', async () => {
            await loadContractState();
        });

    contract.events.Paused({ fromBlock: 'latest' })
        .on('data', async () => {
            await loadContractState();
        });

    contract.events.Unpaused({ fromBlock: 'latest' })
        .on('data', async () => {
            await loadContractState();
        });
};
