const crypto = require('crypto');

const ENCRYPTION_PREFIX = 'enc:v1:';
const KEY_SEED = process.env.FIELD_ENCRYPTION_KEY || '';
const ENCRYPTION_ENABLED = Boolean(KEY_SEED);
const KEY = crypto.createHash('sha256').update(KEY_SEED).digest();

const SENSITIVE_PATIENT_FIELDS = [
    'email',
    'address',
    'emergency_contact_name',
    'emergency_contact_phone',
    'insurance_provider',
];

const encryptValue = (value) => {
    if (!ENCRYPTION_ENABLED || value === null || value === undefined || value === '') {
        return value;
    }

    const plain = String(value);
    if (plain.startsWith(ENCRYPTION_PREFIX)) {
        return plain;
    }

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return `${ENCRYPTION_PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
};

const decryptValue = (value) => {
    if (value === null || value === undefined || value === '') {
        return value;
    }

    const payload = String(value);
    if (!payload.startsWith(ENCRYPTION_PREFIX)) {
        return payload;
    }

    if (!ENCRYPTION_ENABLED) {
        return payload;
    }

    try {
        const body = payload.slice(ENCRYPTION_PREFIX.length);
        const [ivHex, tagHex, encryptedHex] = body.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const tag = Buffer.from(tagHex, 'hex');
        const encrypted = Buffer.from(encryptedHex, 'hex');

        const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
        decipher.setAuthTag(tag);

        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        return decrypted.toString('utf8');
    } catch {
        return payload;
    }
};

const encryptPatientFields = (patient) => {
    const out = { ...patient };
    for (const field of SENSITIVE_PATIENT_FIELDS) {
        out[field] = encryptValue(out[field]);
    }
    return out;
};

const decryptPatientFields = (patient) => {
    const out = { ...patient };
    for (const field of SENSITIVE_PATIENT_FIELDS) {
        out[field] = decryptValue(out[field]);
    }
    return out;
};

module.exports = {
    ENCRYPTION_ENABLED,
    SENSITIVE_PATIENT_FIELDS,
    encryptValue,
    decryptValue,
    encryptPatientFields,
    decryptPatientFields,
};
