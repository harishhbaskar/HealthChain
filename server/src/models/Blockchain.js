const { generateHash } = require('../utils/hashUtils');
const db = require('../config/db');

class Block {
    constructor(index, timestamp, recordId, dataHash, previousHash = '') {
        this.index = index;
        this.timestamp = timestamp;
        this.recordId = recordId;
        this.dataHash = dataHash;
        this.previousHash = previousHash;
        this.currentHash = this.calculateHash();
    }

    calculateHash() {
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
        this._lock = Promise.resolve();
        this._initialized = false;
        this._initPromise = this._init();
    }

    async _init() {
        const promiseDb = db.promise();

        await promiseDb.execute(`
            CREATE TABLE IF NOT EXISTS blockchain_blocks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                block_index INT NOT NULL,
                timestamp VARCHAR(50) NOT NULL,
                record_id INT NOT NULL,
                data_hash VARCHAR(64) NOT NULL,
                previous_hash VARCHAR(64) NOT NULL,
                current_hash VARCHAR(64) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const [[{ cnt }]] = await promiseDb.execute(
            'SELECT COUNT(*) AS cnt FROM blockchain_blocks'
        );

        if (cnt === 0) {
            const genesis = new Block(0, new Date().toISOString(), 0, 'GENESIS_BLOCK', '0');
            await promiseDb.execute(
                `INSERT INTO blockchain_blocks
                    (block_index, timestamp, record_id, data_hash, previous_hash, current_hash)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [genesis.index, genesis.timestamp, genesis.recordId,
                 genesis.dataHash, genesis.previousHash, genesis.currentHash]
            );
        }

        // Validate chain integrity on every startup
        const [[{ total }]] = await promiseDb.execute(
            'SELECT COUNT(*) AS total FROM blockchain_blocks'
        );
        if (total > 1) {
            const [allRows] = await promiseDb.execute(
                'SELECT * FROM blockchain_blocks ORDER BY block_index ASC'
            );
            let valid = true;
            for (let i = 1; i < allRows.length; i++) {
                if (allRows[i].previous_hash !== allRows[i - 1].current_hash) {
                    valid = false;
                    break;
                }
            }
            if (valid) {
                console.log(`🔗 Blockchain initialized — chain VALID (${total} blocks).`);
            } else {
                console.warn(`⚠️  Blockchain initialized — chain INTEGRITY BREACH detected! (${total} blocks)`);
            }
        } else {
            console.log(`🔗 Blockchain initialized — genesis block ready.`);
        }
        this._initialized = true;
    }

    async _ensureInit() {
        if (!this._initialized) await this._initPromise;
    }

    async _acquireLock() {
        const current = this._lock;
        let release;
        this._lock = new Promise(resolve => { release = resolve; });
        await current;
        return release;
    }

    async addBlock(recordId, dataHash) {
        await this._ensureInit();
        const release = await this._acquireLock();
        try {
            const promiseDb = db.promise();
            let [rows] = await promiseDb.execute(
                'SELECT * FROM blockchain_blocks ORDER BY block_index DESC LIMIT 1'
            );

            // Table was truncated after server start (e.g. seed.js) — re-seed genesis
            if (!rows[0]) {
                const genesis = new Block(0, new Date().toISOString(), 0, 'GENESIS_BLOCK', '0');
                await promiseDb.execute(
                    `INSERT INTO blockchain_blocks
                        (block_index, timestamp, record_id, data_hash, previous_hash, current_hash)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [genesis.index, genesis.timestamp, genesis.recordId,
                     genesis.dataHash, genesis.previousHash, genesis.currentHash]
                );
                [rows] = await promiseDb.execute(
                    'SELECT * FROM blockchain_blocks ORDER BY block_index DESC LIMIT 1'
                );
                console.log('🔗 [Blockchain] Genesis block re-created after reset.');
            }

            const latest = rows[0];

            const newBlock = new Block(
                latest.block_index + 1,
                new Date().toISOString(),
                recordId,
                dataHash,
                latest.current_hash
            );

            await promiseDb.execute(
                `INSERT INTO blockchain_blocks
                    (block_index, timestamp, record_id, data_hash, previous_hash, current_hash)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [newBlock.index, newBlock.timestamp, newBlock.recordId,
                 newBlock.dataHash, newBlock.previousHash, newBlock.currentHash]
            );

            console.log(`🔗 [Blockchain] New Block Added: Index ${newBlock.index}`);
            return newBlock;
        } finally {
            release();
        }
    }

    async getBlockByRecordId(recordId) {
        await this._ensureInit();
        const promiseDb = db.promise();
        const [rows] = await promiseDb.execute(
            'SELECT * FROM blockchain_blocks WHERE record_id = ?',
            [Number(recordId)]
        );
        return rows[0] ? this._rowToBlock(rows[0]) : null;
    }

    async isChainValid() {
        await this._ensureInit();
        const promiseDb = db.promise();
        const [rows] = await promiseDb.execute(
            'SELECT * FROM blockchain_blocks ORDER BY block_index ASC'
        );

        for (let i = 1; i < rows.length; i++) {
            const cur  = rows[i];
            const prev = rows[i - 1];

            const recalculated = generateHash(
                cur.block_index + prev.current_hash + cur.timestamp + JSON.stringify(cur.data_hash)
            );

            if (cur.current_hash !== recalculated) return false;
            if (cur.previous_hash !== prev.current_hash) return false;
        }
        return true;
    }

    async getChainStats() {
        await this._ensureInit();
        const promiseDb = db.promise();
        const [rows] = await promiseDb.execute(
            'SELECT * FROM blockchain_blocks ORDER BY block_index ASC'
        );
        const isValid = await this.isChainValid();

        return {
            length: rows.length,
            isValid,
            genesisTimestamp: rows[0]?.timestamp || null,
            latestBlock: rows.length ? this._rowToBlock(rows[rows.length - 1]) : null,
            blocks: rows.map(r => this._rowToBlock(r)),
        };
    }

    _rowToBlock(row) {
        return {
            index:        row.block_index,
            timestamp:    row.timestamp,
            recordId:     row.record_id,
            dataHash:     row.data_hash,
            previousHash: row.previous_hash,
            currentHash:  row.current_hash,
        };
    }
}

// Export a SINGLE instance (Singleton Pattern) so state persists in memory
module.exports = new Blockchain();
