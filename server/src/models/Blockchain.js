const fs = require('fs');
const path = require('path');
const { generateHash } = require('../utils/hashUtils');

const CHAIN_FILE = path.join(__dirname, '../../blockchain_data.json');

class Block {
    constructor(index, timestamp, recordId, dataHash, previousHash = '') {
        this.index = index;
        this.timestamp = timestamp;
        this.recordId = recordId;     // Link to MySQL ID
        this.dataHash = dataHash;     // Hash of the medical data
        this.previousHash = previousHash;
        this.currentHash = this.calculateHash(); // Hash of THIS block
    }

    calculateHash() {
        // We hash the entire block's content to ensure immutability
        return generateHash(
            this.index +
            this.previousHash +
            this.timestamp +
            JSON.stringify(this.dataHash)
        );
    }
}

class Blockchain {
    constructor() {
        // Mutex lock for preventing race conditions
        this._lock = Promise.resolve();

        // Load chain from file if it exists
        try {
            if (fs.existsSync(CHAIN_FILE)) {
                const data = fs.readFileSync(CHAIN_FILE, 'utf8');
                this.chain = JSON.parse(data);
            } else {
                this.chain = [this.createGenesisBlock()];
                this.saveChainSync();
            }
        } catch (err) {
            console.error('❌ Error loading blockchain:', err.message);
            // If corrupted, start fresh with new genesis block
            this.chain = [this.createGenesisBlock()];
            this.saveChainSync();
        }
    }

    createGenesisBlock() {
        return new Block(0, new Date().toISOString(), 0, "GENESIS_BLOCK", "0");
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    // Acquire lock to prevent concurrent modifications
    async _acquireLock() {
        const currentLock = this._lock;
        let releaseLock;
        this._lock = new Promise(resolve => {
            releaseLock = resolve;
        });
        await currentLock;
        return releaseLock;
    }

    // Async addBlock with mutex to prevent race conditions
    async addBlock(recordId, dataHash) {
        const releaseLock = await this._acquireLock();

        try {
            const previousBlock = this.getLatestBlock();
            const newBlock = new Block(
                this.chain.length,
                new Date().toISOString(),
                recordId,
                dataHash,
                previousBlock.currentHash
            );
            this.chain.push(newBlock);
            await this.saveChain();
            console.log(`🔗 [Blockchain] New Block Added: Index ${newBlock.index}`);
            return newBlock;
        } finally {
            releaseLock();
        }
    }

    // Async file write
    async saveChain() {
        return new Promise((resolve, reject) => {
            fs.writeFile(CHAIN_FILE, JSON.stringify(this.chain, null, 2), (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    // Sync save for constructor only
    saveChainSync() {
        fs.writeFileSync(CHAIN_FILE, JSON.stringify(this.chain, null, 2));
    }

    // Find a block by the MySQL Record ID
    getBlockByRecordId(recordId) {
        return this.chain.find(block => block.recordId === Number(recordId));
    }

    // Verify if the entire chain is valid (Integrity Check)
    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const cur = this.chain[i];
            const prev = this.chain[i - 1];

            // Rehydrate: blocks loaded from JSON are plain objects — recalculate hash
            const recalculated = generateHash(
                cur.index + prev.currentHash + cur.timestamp + JSON.stringify(cur.dataHash)
            );

            if (cur.currentHash !== recalculated) return false;
            if (cur.previousHash !== prev.currentHash) return false;
        }
        return true;
    }

    // Return chain statistics for the dashboard / explorer
    getChainStats() {
        return {
            length: this.chain.length,
            isValid: this.isChainValid(),
            genesisTimestamp: this.chain[0]?.timestamp || null,
            latestBlock: this.chain[this.chain.length - 1] || null,
            blocks: this.chain,
        };
    }
}

// Export a SINGLE instance (Singleton Pattern) so state persists in memory
module.exports = new Blockchain();
