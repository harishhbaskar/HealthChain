import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Link2, ShieldCheck, ShieldAlert, Hash, Clock, Database,
  ChevronDown, ChevronRight, Loader2, CheckCircle2, XCircle,
  Activity, Box, Zap, AlertTriangle, RotateCcw, FlaskConical,
  Eye,
} from 'lucide-react';
import { API_URL } from '../constants/api';
import { formatTimestamp } from '../utils/dateTime';

export default function BlockchainExplorer({ token }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user?.role === 'admin';

  const [tab, setTab] = useState('explorer');

  // ── Explorer state ───────────────────────────────────────
  const [chain, setChain]           = useState([]);
  const [chainValid, setChainValid] = useState(null);
  const [loadingChain, setLoadingChain] = useState(true);
  const [expandedBlock, setExpandedBlock] = useState(null);

  // ── Audit state ──────────────────────────────────────────
  const [auditResult, setAuditResult] = useState(null);
  const [auditing, setAuditing]       = useState(false);

  // ── Tamper demo state ────────────────────────────────────
  const [tampering, setTampering]   = useState({});
  const [restoring, setRestoring]   = useState({});

  const authH = { headers: { Authorization: `Bearer ${token}` } };

  // Load chain on mount
  useEffect(() => {
    const ctrl = new AbortController();
    axios
      .get(`${API_URL}/blockchain/status`, { ...authH, signal: ctrl.signal })
      .then((r) => { setChain(r.data.blocks || []); setChainValid(r.data.isValid); })
      .catch((e) => { if (!axios.isCancel(e)) toast.error('Failed to load chain'); })
      .finally(() => setLoadingChain(false));
    return () => ctrl.abort();
  }, [token]);

  // ── Full audit ───────────────────────────────────────────
  const runAudit = async () => {
    setAuditing(true);
    try {
      const r = await axios.get(`${API_URL}/blockchain/audit`, authH);
      setAuditResult(r.data);
      if (r.data.tampered > 0) {
        toast.error(`⚠️ ${r.data.tampered} tampered record${r.data.tampered > 1 ? 's' : ''} detected!`);
      } else {
        toast.success(`All ${r.data.secure} records verified secure.`);
      }
    } catch {
      toast.error('Audit failed');
    } finally {
      setAuditing(false);
    }
  };

  // ── Tamper demo ──────────────────────────────────────────
  const simulateTamper = async (visitId) => {
    setTampering((p) => ({ ...p, [visitId]: true }));
    try {
      await axios.post(`${API_URL}/admin/tamper/${visitId}`, {}, authH);
      toast('Record corrupted in DB — run audit to detect it.', { icon: '⚠️' });
      // Refresh audit if already run
      if (auditResult) await runAudit();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Tamper failed');
    } finally {
      setTampering((p) => ({ ...p, [visitId]: false }));
    }
  };

  const restoreRecord = async (visitId) => {
    setRestoring((p) => ({ ...p, [visitId]: true }));
    try {
      await axios.post(`${API_URL}/admin/restore/${visitId}`, {}, authH);
      toast.success('Record restored to original state.');
      if (auditResult) await runAudit();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Restore failed');
    } finally {
      setRestoring((p) => ({ ...p, [visitId]: false }));
    }
  };

  const truncateHash = (h, n = 14) => (h ? `${h.slice(0, n)}...${h.slice(-6)}` : '—');
  const recordBlocks = chain.filter((b) => b.recordId !== 0);

  // ── status helpers ───────────────────────────────────────
  const auditMap = {};
  (auditResult?.records || []).forEach((r) => { auditMap[r.visitId] = r; });

  if (loadingChain) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-3">
            <Link2 className="h-7 w-7 text-blue-400" />
            Blockchain Explorer
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            SHA-256 hash-linked ledger — immutable audit trail for every medical record
          </p>
        </div>
        <button
          onClick={runAudit}
          disabled={auditing}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60
                     text-white text-sm font-semibold rounded-xl transition-colors shrink-0"
        >
          {auditing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {auditing ? 'Auditing...' : 'Run Full Audit'}
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          icon={<Box className="h-5 w-5 text-blue-400" />}
          label="Total Blocks"
          value={chain.length}
          sub={`${recordBlocks.length} records + genesis`}
        />
        <StatCard
          icon={chainValid
            ? <ShieldCheck className="h-5 w-5 text-emerald-400" />
            : <ShieldAlert className="h-5 w-5 text-red-400" />}
          label="Chain Integrity"
          value={chainValid === null ? '—' : chainValid ? 'VALID' : 'BROKEN'}
          accent={chainValid === false ? 'red' : 'emerald'}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />}
          label="Records Verified"
          value={auditResult ? auditResult.secure : '—'}
          sub={auditResult ? `${auditResult.tampered} tampered` : 'Run audit'}
          accent={auditResult?.tampered > 0 ? 'red' : 'emerald'}
        />
        <StatCard
          icon={<Activity className="h-5 w-5 text-violet-400" />}
          label="Algorithm"
          value="SHA-256"
          sub="Cryptographic hashing"
          accent="violet"
        />
      </div>

      {/* ── Audit banner ── */}
      {auditResult && (
        <div className={`mb-6 rounded-xl border px-5 py-4 flex items-center gap-4
          ${auditResult.tampered > 0
            ? 'border-red-500/40 bg-red-950/20'
            : 'border-emerald-500/40 bg-emerald-950/20'}`}>
          {auditResult.tampered > 0
            ? <XCircle className="h-6 w-6 text-red-400 shrink-0" />
            : <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />}
          <div className="flex-1">
            <p className={`text-sm font-semibold ${auditResult.tampered > 0 ? 'text-red-300' : 'text-emerald-300'}`}>
              {auditResult.tampered > 0
                ? `⚠️ Integrity breach — ${auditResult.tampered} record${auditResult.tampered > 1 ? 's' : ''} tampered`
                : `✅ All ${auditResult.secure} records verified — chain is secure`}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Chain link integrity: {auditResult.chainIntegrity ? 'VALID' : 'BROKEN'} ·
              Total blocks audited: {auditResult.total}
            </p>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-4 bg-gray-800/60 rounded-xl p-1 w-fit">
        {[
          { key: 'explorer', label: 'Block Chain', icon: Link2 },
          ...(isAdmin ? [{ key: 'tamper', label: 'Tamper Demo', icon: FlaskConical }] : []),
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${tab === key
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-gray-200'}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          TAB: BLOCK CHAIN EXPLORER
      ══════════════════════════════════════════════════════ */}
      {tab === 'explorer' && (
        <div className="space-y-0">
          {chain.map((block, idx) => {
            const isGenesis = block.recordId === 0;
            const isExpanded = expandedBlock === idx;
            const audit = auditMap[block.recordId];
            const status = audit?.status;

            return (
              <div key={idx}>
                {idx > 0 && (
                  <div className="flex justify-center">
                    <div className="w-px h-6 bg-linear-to-b from-blue-500/50 to-transparent" />
                  </div>
                )}

                <div
                  onClick={() => setExpandedBlock(isExpanded ? null : idx)}
                  className={`rounded-xl border cursor-pointer transition-all overflow-hidden
                    ${isGenesis        ? 'border-amber-500/40 bg-amber-950/10'
                    : status === 'TAMPERED' ? 'border-red-500/50 bg-red-950/20'
                    : status === 'SECURE'   ? 'border-emerald-500/40 bg-emerald-950/10'
                    : 'border-gray-700 bg-gray-800 hover:border-blue-500/30'}`}
                >
                  {/* Block header */}
                  <div className="flex items-center gap-4 px-5 py-4">
                    {/* Index badge */}
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0
                      ${isGenesis        ? 'bg-amber-500/20 text-amber-400'
                      : status === 'TAMPERED' ? 'bg-red-500/20 text-red-400'
                      : status === 'SECURE'   ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-blue-500/20 text-blue-400'}`}>
                      #{block.index}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-200">
                          {isGenesis ? 'Genesis Block' : `Visit Record #${block.recordId}`}
                        </span>
                        {audit && (
                          <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1
                            ${audit.status === 'SECURE'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-red-500/20 text-red-400'}`}>
                            {audit.status === 'SECURE'
                              ? <><CheckCircle2 className="h-3 w-3" /> Verified</>
                              : <><XCircle className="h-3 w-3" /> Tampered</>}
                          </span>
                        )}
                        {!isGenesis && audit?.patientName && (
                          <span className="text-xs text-gray-500">{audit.patientName}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimestamp(block.timestamp)}
                        </span>
                        {!isGenesis && audit?.assessment && (
                          <span className="truncate max-w-xs">{audit.assessment}</span>
                        )}
                      </div>
                    </div>

                    <div className="hidden sm:block text-right shrink-0">
                      <div className="text-xs text-gray-500 mb-0.5">Block Hash</div>
                      <code className="text-xs text-blue-400 font-mono">{truncateHash(block.currentHash)}</code>
                    </div>

                    <div className="shrink-0 text-gray-500">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-gray-700/60 px-5 py-4 space-y-3">
                      <HashRow label="Current Hash"  value={block.currentHash}  color="text-blue-400" />
                      <HashRow label="Previous Hash" value={block.previousHash} color="text-amber-400" />
                      <HashRow label="Data Hash"     value={block.dataHash}     color="text-emerald-400" />
                      {audit && audit.status === 'TAMPERED' && (
                        <>
                          <div className="border-t border-red-500/20 pt-3">
                            <p className="text-xs text-red-400 font-semibold mb-2">⚠️ Hash Mismatch Detected</p>
                            <HashRow label="Stored (BC)"   value={audit.storedHash}   color="text-emerald-400" />
                            <HashRow label="Current (DB)"  value={audit.computedHash} color="text-red-400" />
                          </div>
                        </>
                      )}
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-gray-500 w-32">Timestamp</span>
                        <span className="text-gray-300">{block.timestamp}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-gray-500 w-32">Record ID</span>
                        <span className="text-gray-300">{isGenesis ? 'N/A (Genesis)' : block.recordId}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: TAMPER DEMO  (admin only)
      ══════════════════════════════════════════════════════ */}
      {tab === 'tamper' && isAdmin && (
        <div>
          {/* Explainer */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/10 p-5 mb-6">
            <div className="flex items-start gap-3">
              <FlaskConical className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-300">Interactive Tamper Detection Demo</p>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Click <strong className="text-gray-200">Simulate Tamper</strong> on any record to corrupt
                  it directly in the database — the blockchain ledger stays untouched.
                  Then click <strong className="text-gray-200">Run Full Audit</strong> above to see the system
                  detect the breach. Click <strong className="text-gray-200">Restore</strong> to undo.
                </p>
              </div>
            </div>
          </div>

          {/* Run audit reminder if no audit yet */}
          {!auditResult && (
            <div className="text-center py-12 text-gray-500">
              <Eye className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Run a Full Audit first to load record statuses</p>
              <button
                onClick={runAudit}
                disabled={auditing}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {auditing ? 'Auditing...' : 'Run Full Audit'}
              </button>
            </div>
          )}

          {/* Record list */}
          {auditResult && (
            <div className="space-y-2">
              {auditResult.records.map((rec) => (
                <div
                  key={rec.visitId}
                  className={`flex items-center gap-4 rounded-xl border px-5 py-4 transition-all
                    ${rec.status === 'TAMPERED'
                      ? 'border-red-500/50 bg-red-950/20'
                      : 'border-gray-700 bg-gray-800'}`}
                >
                  {/* Status icon */}
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0
                    ${rec.status === 'TAMPERED' ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}>
                    {rec.status === 'TAMPERED'
                      ? <XCircle className="h-5 w-5 text-red-400" />
                      : <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-200">
                        Visit #{rec.visitId}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                        ${rec.status === 'TAMPERED'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {rec.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 truncate">
                      <span className="text-gray-400">{rec.patientName}</span>
                      {rec.assessment && <span className="ml-2">— {rec.assessment}</span>}
                    </div>
                    {rec.status === 'TAMPERED' && (
                      <div className="mt-1.5 grid grid-cols-1 gap-0.5">
                        <code className="text-[10px] text-gray-500">
                          Blockchain: <span className="text-emerald-400">{rec.storedHash.slice(0, 20)}...</span>
                        </code>
                        <code className="text-[10px] text-gray-500">
                          Database: &nbsp;&nbsp;<span className="text-red-400">{rec.computedHash.slice(0, 20)}...</span>
                        </code>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex gap-2">
                    {rec.status !== 'TAMPERED' && !rec.canRestore && (
                      <button
                        onClick={() => simulateTamper(rec.visitId)}
                        disabled={tampering[rec.visitId]}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                                   border border-amber-500/30 text-amber-400 hover:bg-amber-500/10
                                   disabled:opacity-50 transition-colors"
                      >
                        {tampering[rec.visitId]
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <AlertTriangle className="h-3 w-3" />}
                        Simulate Tamper
                      </button>
                    )}
                    {(rec.status === 'TAMPERED' || rec.canRestore) && (
                      <button
                        onClick={() => restoreRecord(rec.visitId)}
                        disabled={restoring[rec.visitId]}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                                   border border-blue-500/30 text-blue-400 hover:bg-blue-500/10
                                   disabled:opacity-50 transition-colors"
                      >
                        {restoring[rec.visitId]
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <RotateCcw className="h-3 w-3" />}
                        Restore
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── How It Works ── */}
      {tab === 'explorer' && (
        <div className="mt-8 bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h3 className="text-base font-semibold text-gray-100 mb-4 flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-400" />
            How HealthChain Blockchain Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StepCard step="1" title="Record Created"
              desc="When a doctor creates a visit, the SOAP note is hashed with SHA-256 — producing a unique fingerprint of that exact data." />
            <StepCard step="2" title="Block Added"
              desc="The hash is stored as a new block referencing the previous block's hash, forming an immutable chain. Any retroactive change breaks the link." />
            <StepCard step="3" title="Cross-Validation"
              desc="Full Audit re-hashes every current DB record and compares against the stored blockchain hash. Mismatches — even a single character change — are instantly detected." />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────

function StatCard({ icon, label, value, sub, accent = 'blue' }) {
  const accentMap = {
    blue:    'border-blue-700/40 bg-blue-950/20',
    emerald: 'border-emerald-700/40 bg-emerald-950/20',
    red:     'border-red-700/40 bg-red-950/20',
    violet:  'border-violet-700/40 bg-violet-950/20',
  };
  const valMap = {
    blue: 'text-blue-300', emerald: 'text-emerald-300', red: 'text-red-300', violet: 'text-violet-300',
  };
  return (
    <div className={`rounded-xl border p-4 ${accentMap[accent] || accentMap.blue}`}>
      <div className="flex items-center gap-2 mb-2">{icon}
        <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className={`text-xl font-bold ${valMap[accent] || valMap.blue}`}>{value}</div>
      {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
    </div>
  );
}

function HashRow({ label, value, color }) {
  return (
    <div className="flex items-start gap-3 text-xs">
      <span className="text-gray-500 w-32 shrink-0">{label}</span>
      <code className={`${color} font-mono break-all`}>{value}</code>
    </div>
  );
}

function StepCard({ step, title, desc }) {
  return (
    <div className="bg-gray-700/30 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="h-6 w-6 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center">
          {step}
        </span>
        <span className="text-sm font-medium text-gray-200">{title}</span>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
    </div>
  );
}
