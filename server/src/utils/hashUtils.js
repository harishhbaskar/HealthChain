const crypto = require('crypto');

// Generates a SHA-256 hash for any string input
const generateHash = (data) => {
    return crypto.createHash('sha256').update(data).digest('hex');
};

module.exports = { generateHash };