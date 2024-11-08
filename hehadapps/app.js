// Check for saved theme preference, otherwise use system preference
if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark')
} else {
    document.documentElement.classList.remove('dark')
}
// Theme toggle functionality
const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click', () => {
    if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        localStorage.theme = 'light';
    } else {
        document.documentElement.classList.add('dark');
        localStorage.theme = 'dark';
    }
});

// Contract ABI - Ganti dengan ABI contract Anda
const contractABI = [
    {
        inputs: [],
        stateMutability: "nonpayable",
        type: "constructor",
    },
    {
        inputs: [],
        name: "EmptyMessage",
        type: "error",
    },
    {
        inputs: [],
        name: "NotOwner",
        type: "error",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: "string",
                name: "oldMessage",
                type: "string",
            },
            {
                indexed: false,
                internalType: "string",
                name: "newMessage",
                type: "string",
            },
            {
                indexed: false,
                internalType: "address",
                name: "changedBy",
                type: "address",
            },
        ],
        name: "MessageChanged",
        type: "event",
    },
    {
        inputs: [
            {
                internalType: "string",
                name: "newMessage",
                type: "string",
            },
        ],
        name: "setMessage",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "getMessage",
        outputs: [
            {
                internalType: "string",
                name: "",
                type: "string",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "getMessageLength",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "getOwner",
        outputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "owner",
        outputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
];

// Contract address - Ganti dengan address contract Anda
const contractAddress = "0x6B852d74cB201F43E3d34Ba0222Eb8D9C00db3f7";

// Elements
const connectWalletBtn = document.getElementById("connectWallet");
const walletAddressText = document.getElementById("walletAddress");
const refreshMessageBtn = document.getElementById("refreshMessage");
const currentMessageText = document.getElementById("currentMessage");
const newMessageInput = document.getElementById("newMessage");
const updateMessageBtn = document.getElementById("updateMessage");
const errorAlert = document.getElementById("errorAlert");
const successAlert = document.getElementById("successAlert");
const errorMessage = document.getElementById("errorMessage");
const successMessage = document.getElementById("successMessage");

let web3;
let contract;
let userAccount;

// Connect wallet
async function connectWallet() {
    try {
        if (typeof window.ethereum !== "undefined") {
            // Request account access
            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            userAccount = accounts[0];

            // Initialize Web3
            web3 = new Web3(window.ethereum);
            contract = new web3.eth.Contract(contractABI, contractAddress);

            // Update UI
            walletAddressText.textContent = `${userAccount.slice(0, 6)}...${userAccount.slice(-4)}`;
            walletAddressText.classList.remove("hidden");
            connectWalletBtn.textContent = "Connected";
            connectWalletBtn.disabled = true;
            newMessageInput.disabled = false;
            updateMessageBtn.disabled = false;

            // Get initial message
            getMessage();

            showSuccess("Wallet connected successfully!");
        } else {
            showError("Please install MetaMask!");
        }
    } catch (error) {
        showError("Failed to connect wallet");
        console.error(error);
    }
}

// Get message
async function getMessage() {
    try {
        if (!contract) return;
        const message = await contract.methods.getMessage().call();
        currentMessageText.textContent = message;
    } catch (error) {
        showError("Failed to fetch message");
        console.error(error);
    }
}

// Update message
async function updateMessage() {
    try {
        if (!contract || !userAccount) return;
        const newMessage = newMessageInput.value;
        if (!newMessage) return;

        updateMessageBtn.disabled = true;
        updateMessageBtn.innerHTML = '<span class="animate-spin">↻</span>';

        await contract.methods.setMessage(newMessage).send({ from: userAccount });

        showSuccess("Message updated successfully!");
        getMessage();
        newMessageInput.value = "";
    } catch (error) {
        showError("Failed to update message");
        console.error(error);
    } finally {
        updateMessageBtn.disabled = false;
        updateMessageBtn.textContent = "Update";
    }
}

// Show error
function showError(message) {
    errorMessage.textContent = message;
    errorAlert.classList.remove("hidden");
    setTimeout(() => {
        errorAlert.classList.add("hidden");
    }, 3000);
}

// Show success
function showSuccess(message) {
    successMessage.textContent = message;
    successAlert.classList.remove("hidden");
    setTimeout(() => {
        successAlert.classList.add("hidden");
    }, 3000);
}

// Event listeners
connectWalletBtn.addEventListener("click", connectWallet);
refreshMessageBtn.addEventListener("click", getMessage);
updateMessageBtn.addEventListener("click", updateMessage);

// Handle account changes
if (window.ethereum) {
    window.ethereum.on("accountsChanged", function (accounts) {
        window.location.reload();
    });
}
