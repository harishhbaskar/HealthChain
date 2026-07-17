const { generateHash } = require('../utils/hashUtils');
const AuditLog = require('../models/AuditLog');
const myBlockchain = require('../models/Blockchain');

// In-memory store for tamper demo: visitId → original condition_name
const tamperedOriginals = new Map();

const buildDeterministicString = ({ subjective, bp, hr, temp, assessment, plan }) =>
    [
        `S: ${(subjective || '').trim()}`,
        `O: BP ${(bp || '').toString().trim()} HR ${(hr || '').toString().trim()} Temp ${(temp || '').toString().trim()}`,
        `A: ${(assessment || '').trim()}`,
        `P: ${(plan || '').trim()}`,
    ].join('\n');

// ─────────────────────────────────────────────────────────────
// GET /blockchain/audit
// Cross-validates every blockchain hash against current DB data.
// ─────────────────────────────────────────────────────────────
exports.fullAudit = async (req, res) => {
    const ip = req.ip || req.connection.remoteAddress;
    try {
        const db = require('../config/db').promise();
        const stats = await myBlockchain.getChainStats();
        const blocks = (stats.blocks || []).filter((b) => b.recordId !== 0);

        const results = await Promise.all(
            blocks.map(async (block) => {
                const [rows] = await db.execute(
                    `SELECT
                        v.chief_complaint,
                        vt.blood_pressure, vt.heart_rate, vt.temperature,
                        d.condition_name,
                        p.medication_name,
                        pt.first_name AS patient_first,
                        pt.last_name  AS patient_last
                     FROM visits v
                     LEFT JOIN vitals        vt ON vt.visit_id = v.id
                     LEFT JOIN diagnoses     d  ON d.visit_id  = v.id
                     LEFT JOIN prescriptions p  ON p.visit_id  = v.id
                     LEFT JOIN patients      pt ON pt.id       = v.patient_id
                     WHERE v.id = ?`,
                    [block.recordId]
                );

                if (!rows[0]) {
                    return {
                        visitId: block.recordId,
                        blockIndex: block.index,
                        status: 'MISSING',
                        timestamp: block.timestamp,
                    };
                }

                const v = rows[0];
                const deterministicStr = buildDeterministicString({
                    subjective: v.chief_complaint,
                    bp: v.blood_pressure,
                    hr: v.heart_rate,
                    temp: v.temperature,
                    assessment: v.condition_name,
                    plan: v.medication_name,
                });

                const computedHash = generateHash(deterministicStr);
                const status = computedHash === block.dataHash ? 'SECURE' : 'TAMPERED';

                return {
                    visitId: block.recordId,
                    blockIndex: block.index,
                    status,
                    patientName: `${v.patient_first || ''} ${v.patient_last || ''}`.trim() || 'Unknown',
                    assessment: v.condition_name,
                    timestamp: block.timestamp,
                    storedHash: block.dataHash,
                    computedHash,
                    canRestore: tamperedOriginals.has(String(block.recordId)),
                };
            })
        );

        const secure  = results.filter((r) => r.status === 'SECURE').length;
        const tampered = results.filter((r) => r.status === 'TAMPERED').length;
        const missing  = results.filter((r) => r.status === 'MISSING').length;

        AuditLog.log(
            req.userId,
            'BLOCKCHAIN_AUDIT',
            `Full audit: ${secure} secure, ${tampered} tampered`,
            ip
        );

        res.json({
            chainIntegrity: stats.isValid,
            total: results.length,
            secure,
            tampered,
            missing,
            records: results,
        });
    } catch (err) {
        console.error('fullAudit error:', err);
        res.status(500).json({ error: 'Audit failed: ' + err.message });
    }
};

// ─────────────────────────────────────────────────────────────
// POST /admin/tamper/:visitId
// Corrupts the condition_name in the DB (blockchain stays untouched).
// ─────────────────────────────────────────────────────────────
exports.simulateTamper = async (req, res) => {
    const { visitId } = req.params;
    const ip = req.ip || req.connection.remoteAddress;
    try {
        const db = require('../config/db').promise();
        const [[row]] = await db.execute(
            'SELECT condition_name FROM diagnoses WHERE visit_id = ?',
            [visitId]
        );
        if (!row) return res.status(404).json({ error: 'Visit not found' });

        if (tamperedOriginals.has(String(visitId))) {
            return res.status(400).json({ error: 'Already tampered — restore first.' });
        }

        tamperedOriginals.set(String(visitId), row.condition_name);

        await db.execute(
            'UPDATE diagnoses SET condition_name = ? WHERE visit_id = ?',
            ['⚠️ UNAUTHORIZED MODIFICATION — DATA INTEGRITY BREACH', visitId]
        );

        AuditLog.log(req.userId, 'TAMPER_DEMO', `Simulated tamper on Visit #${visitId}`, ip);
        res.json({ message: 'Record tampered for demo', visitId: Number(visitId) });
    } catch (err) {
        console.error('simulateTamper error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
// POST /admin/restore/:visitId
// Restores the original condition_name (undoes simulateTamper).
// ─────────────────────────────────────────────────────────────
exports.restoreRecord = async (req, res) => {
    const { visitId } = req.params;
    const ip = req.ip || req.connection.remoteAddress;

    const original = tamperedOriginals.get(String(visitId));
    if (original === undefined) {
        return res.status(400).json({ error: 'No active tamper demo for this visit.' });
    }

    try {
        const db = require('../config/db').promise();
        await db.execute(
            'UPDATE diagnoses SET condition_name = ? WHERE visit_id = ?',
            [original, visitId]
        );
        tamperedOriginals.delete(String(visitId));

        AuditLog.log(req.userId, 'RESTORE_RECORD', `Restored Visit #${visitId} to original state`, ip);
        res.json({ message: 'Record restored', visitId: Number(visitId) });
    } catch (err) {
        console.error('restoreRecord error:', err);
        res.status(500).json({ error: err.message });
    }
};
