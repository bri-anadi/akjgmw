class FaucetApp {
    constructor() {
        this.FAUCET_ADDRESS = '0x39F9BC414d5176D14f5Da90695738f5dD4A0967b';
        this.web3 = null;
        this.faucetContract = null;
        this.userAddress = null;
        this.contractAbi = null;
        this.updateInterval = null;

        // Bind methods to maintain this context
        this.handleAccountsChanged = this.handleAccountsChanged.bind(this);
        this.handleChainChanged = this.handleChainChanged.bind(this);
        this.connectWallet = this.connectWallet.bind(this);
        this.requestTokens = this.requestTokens.bind(this);
    }

    // Initialize the application
    async init() {
        try {
            // Fetch ABI
            const response = await fetch('abi.json');
            const abiJson = await response.json();
            this.contractAbi = abiJson.abi;

            // Add event listeners
            document.getElementById('connectWallet').addEventListener('click', this.connectWallet);
            document.getElementById('requestTokens').addEventListener('click', this.requestTokens);

            // Setup MetaMask event listeners
            if (window.ethereum) {
                window.ethereum.on('accountsChanged', this.handleAccountsChanged);
                window.ethereum.on('chainChanged', this.handleChainChanged);
            }

            // Initialize wallet if already connected
            await this.initializeWallet();

            // Start update interval
            this.updateInterval = setInterval(() => this.updateFaucetInfo(), 30000);
        } catch (error) {
            console.error('Initialization error:', error);
            this.addTransaction('Failed to initialize application: ' + error.message);
        }
    }

    // Initialize wallet if MetaMask is already connected
    async initializeWallet() {
        if (typeof window.ethereum !== 'undefined') {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    await this.setupWeb3(accounts[0]);
                }
            } catch (error) {
                console.error('Error initializing wallet:', error);
                this.addTransaction('Wallet initialization failed: ' + error.message);
            }
        }
    }

    // Setup Web3 and contract instances
    async setupWeb3(address) {
        this.web3 = new Web3(window.ethereum);
        this.userAddress = address;
        this.faucetContract = new this.web3.eth.Contract(this.contractAbi, this.FAUCET_ADDRESS);

        document.getElementById('connectWallet').textContent =
            `${this.userAddress.slice(0, 6)}...${this.userAddress.slice(-4)}`;

        // Update network info
        const networkId = await this.web3.eth.net.getId();
        const networkName = this.getNetworkName(networkId);
        document.getElementById('networkStatus').textContent = `Network: ${networkName}`;

        await this.updateFaucetInfo();
    }

    // Connect wallet function
    async connectWallet() {
        if (typeof window.ethereum !== 'undefined') {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                await this.setupWeb3(accounts[0]);
                this.addTransaction('Wallet connected successfully');
            } catch (error) {
                console.error('Error connecting wallet:', error);
                this.addTransaction('Failed to connect wallet: ' + error.message);
            }
        } else {
            alert('Please install MetaMask!');
            this.addTransaction('MetaMask is not installed');
        }
    }

    // Update faucet information
    async updateFaucetInfo() {
        if (!this.faucetContract || !this.userAddress) return;

        try {
            const [balance, amount, timeUntilNext] = await Promise.all([
                this.faucetContract.methods.getFaucetBalance().call(),
                this.faucetContract.methods.amountPerRequest().call(),
                this.faucetContract.methods.timeUntilNextRequest(this.userAddress).call()
            ]);

            document.getElementById('faucetBalance').textContent =
                this.web3.utils.fromWei(balance, 'ether');
            document.getElementById('amountPerRequest').textContent =
                this.web3.utils.fromWei(amount, 'ether');
            document.getElementById('timeUntilNext').textContent = timeUntilNext;

            // Disable/enable request button based on time until next request
            const requestButton = document.getElementById('requestTokens');
            requestButton.disabled = timeUntilNext > 0;
        } catch (error) {
            console.error('Error updating faucet info:', error);
            this.addTransaction('Failed to update faucet info: ' + error.message);
        }
    }

    // Request tokens function
    async requestTokens() {
        if (!this.faucetContract || !this.userAddress) {
            this.addTransaction('Please connect your wallet first');
            return;
        }

        try {
            const tx = await this.faucetContract.methods.requestTokens()
                .send({ from: this.userAddress });

            this.addTransaction(`Tokens requested successfully. TX: ${tx.transactionHash}`);
            await this.updateFaucetInfo();
        } catch (error) {
            console.error('Error requesting tokens:', error);
            this.addTransaction('Failed to request tokens: ' + error.message);
        }
    }

    // Add transaction to the list
    addTransaction(message) {
        const txDiv = document.createElement('div');
        txDiv.className = 'bg-gray-700 rounded-lg p-3 text-sm';
        txDiv.textContent = message;

        const timestamp = document.createElement('div');
        timestamp.className = 'text-xs text-gray-400 mt-1';
        timestamp.textContent = new Date().toLocaleTimeString();
        txDiv.appendChild(timestamp);

        const txList = document.getElementById('transactions');
        txList.insertBefore(txDiv, txList.firstChild);

        if (txList.children.length > 5) {
            txList.removeChild(txList.lastChild);
        }
    }

    // Handle account changes
    async handleAccountsChanged(accounts) {
        if (accounts.length === 0) {
            this.userAddress = null;
            document.getElementById('connectWallet').textContent = 'Connect Wallet';
            document.getElementById('networkStatus').textContent = '';
            this.addTransaction('Wallet disconnected');
        } else if (accounts[0] !== this.userAddress) {
            await this.setupWeb3(accounts[0]);
            this.addTransaction('Account changed');
        }
    }

    // Handle chain changes
    handleChainChanged(chainId) {
        window.location.reload();
    }

    // Get network name from network ID
    getNetworkName(networkId) {
        const networks = {
            1: 'Ethereum Mainnet',
            5: 'Goerli Testnet',
            11155111: 'Sepolia Testnet',
            137: 'Polygon Mainnet',
            80001: 'Mumbai Testnet'
        };
        return networks[networkId] || `Chain ID: ${networkId}`;
    }

    // Cleanup function
    cleanup() {
        if (window.ethereum) {
            window.ethereum.removeListener('accountsChanged', this.handleAccountsChanged);
            window.ethereum.removeListener('chainChanged', this.handleChainChanged);
        }
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new FaucetApp();
    app.init();

    // Cleanup on page unload
    window.addEventListener('unload', () => {
        app.cleanup();
    });
});
