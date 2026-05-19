import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Link2,
  ShieldCheck,
  ShieldAlert,
  Hash,
  Clock,
  Database,
  ChevronDown,
  ChevronRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Activity,
  Box,
} from 'lucide-react';
import { API_URL } from '../constants/api';
import { formatTimestamp } from '../utils/dateTime';

export default function BlockchainExplorer({ token }) {
  const [loading, setLoading] = useState(true);
  const [chain, setChain] = useState([]);
  const [chainValid, setChainValid] = useState(null);
  const [expandedBlock, setExpandedBlock] = useState(null);
  const [verifyResults, setVerifyResults] = useState({});
  const [verifyingAll, setVerifyingAll] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const fetchChainData = async () => {
      try {
        const res = await axios.get(`${API_URL}/blockchain/status`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        setChain(res.data.blocks || []);
        setChainValid(res.data.isValid);
      } catch (err) {
        if (!axios.isCancel(err)) {
          console.error('Error fetching blockchain:', err);
          toast.error('Failed to load blockchain data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchChainData();

    return () => controller.abort();
  }, [token]);

  const fetchChain = async () => {
    try {
      const res = await axios.get(`${API_URL}/blockchain/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setChain(res.data.blocks || []);
      setChainValid(res.data.isValid);
    } catch (err) {
      console.error('Error fetching blockchain:', err);
      toast.error('Failed to load blockchain data');
    } finally {
      setLoading(false);
    }
  };

  const verifyRecord = async (visitId) => {
    setVerifyResults((prev) => ({ ...prev, [visitId]: 'loading' }));
    try {
      const res = await axios.get(`${API_URL}/verify/${visitId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVerifyResults((prev) => ({ ...prev, [visitId]: res.data.status }));
    } catch {
      setVerifyResults((prev) => ({ ...prev, [visitId]: 'ERROR' }));
    }
  };

  const verifyAllRecords = async () => {
    setVerifyingAll(true);
    const recordBlocks = chain.filter((b) => b.recordId !== 0);
    for (const block of recordBlocks) {
      await verifyRecord(block.recordId);
    }
    setVerifyingAll(false);
    toast.success('All records verified!');
  };

  const truncateHash = (hash, len = 16) =>
    hash ? `${hash.slice(0, len)}...${hash.slice(-8)}` : '—';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const recordBlocks = chain.filter((b) => b.recordId !== 0);
  const tampered = Object.values(verifyResults).filter((v) => v === 'TAMPERED').length;
  const secure = Object.values(verifyResults).filter((v) => v === 'SECURE').length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-3">
          <Link2 className="h-7 w-7 text-blue-500" />
          Blockchain Explorer
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Immutable ledger of all medical record hashes — tamper-proof audit trail
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<Box className="h-5 w-5 text-blue-700" />}
          label="Total Blocks"
          value={chain.length}
          sub={`${recordBlocks.length} records + genesis`}
          bg="bg-blue-50 border-blue-200"
          valueColor="text-blue-900"
        />
        <StatCard
          icon={
            chainValid ? (
              <ShieldCheck className="h-5 w-5 text-emerald-700" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-red-700" />
            )
          }
          label="Chain Integrity"
          value={chainValid ? 'VALID' : 'BROKEN'}
          sub="Hash-linked verification"
          bg={
            chainValid
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-red-50 border-red-200'
          }
          valueColor={chainValid ? 'text-emerald-800' : 'text-red-800'}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-700" />}
          label="Records Verified"
          value={secure}
          sub={`${tampered} tampered detected`}
          bg="bg-emerald-50 border-emerald-200"
          valueColor="text-emerald-900"
        />
        <StatCard
          icon={<Activity className="h-5 w-5 text-violet-700" />}
          label="Algorithm"
          value="SHA-256"
          sub="Cryptographic hashing"
          bg="bg-violet-50 border-violet-200"
          valueColor="text-violet-900"
        />
      </div>

      {/* Verify All Button */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-200">Block Chain</h2>
        <button
          onClick={verifyAllRecords}
          disabled={verifyingAll}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {verifyingAll ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
          {verifyingAll ? 'Verifying...' : 'Verify All Records'}
        </button>
      </div>

      {/* Chain Visualization */}
      <div className="space-y-0">
        {chain.map((block, idx) => {
          const isGenesis = block.recordId === 0;
          const isExpanded = expandedBlock === idx;
          const vStatus = verifyResults[block.recordId];

          return (
            <div key={idx}>
              {/* Connector Line */}
              {idx > 0 && (
                <div className="flex justify-center">
                  <div className="w-px h-6 bg-linear-to-b from-blue-500/60 to-blue-500/20" />
                </div>
              )}

              {/* Block Card */}
              <div
                className={`bg-gray-800 border rounded-xl overflow-hidden transition-all cursor-pointer hover:border-blue-500/40 ${
                  isGenesis
                    ? 'border-amber-500/40'
                    : vStatus === 'TAMPERED'
                    ? 'border-red-500/50 bg-red-950/20'
                    : vStatus === 'SECURE'
                    ? 'border-emerald-500/40'
                    : 'border-gray-700'
                }`}
                onClick={() => setExpandedBlock(isExpanded ? null : idx)}
              >
                {/* Block Header */}
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Index Badge */}
                  <div
                    className={`h-10 w-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                      isGenesis
                        ? 'bg-amber-500/20 text-amber-400'
                        : vStatus === 'TAMPERED'
                        ? 'bg-red-500/20 text-red-400'
                        : vStatus === 'SECURE'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    #{block.index}
                  </div>

                  {/* Block Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-200">
                        {isGenesis ? 'Genesis Block' : `Visit Record #${block.recordId}`}
                      </span>
                      {vStatus === 'SECURE' && (
                        <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Verified
                        </span>
                      )}
                      {vStatus === 'TAMPERED' && (
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <XCircle className="h-3 w-3" /> Tampered
                        </span>
                      )}
                      {vStatus === 'loading' && (
                        <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(block.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Hash Preview */}
                  <div className="hidden sm:block text-right shrink-0">
                    <div className="text-xs text-gray-500 mb-0.5">Block Hash</div>
                    <code className="text-xs text-blue-400 font-mono">
                      {truncateHash(block.currentHash)}
                    </code>
                  </div>

                  {/* Expand Arrow */}
                  <div className="shrink-0 text-gray-500">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-gray-700 px-5 py-4 bg-gray-800/50 space-y-3">
                    <HashRow label="Current Hash" value={block.currentHash} color="text-blue-400" />
                    <HashRow
                      label="Previous Hash"
                      value={block.previousHash}
                      color="text-amber-400"
                    />
                    <HashRow
                      label="Data Hash (Record)"
                      value={block.dataHash}
                      color="text-emerald-400"
                    />
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-gray-500 w-32">Timestamp</span>
                      <span className="text-gray-300">{block.timestamp}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-gray-500 w-32">Record ID</span>
                      <span className="text-gray-300">
                        {isGenesis ? 'N/A (Genesis)' : block.recordId}
                      </span>
                    </div>

                    {/* Verify Single Button */}
                    {!isGenesis && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          verifyRecord(block.recordId);
                        }}
                        className="mt-2 flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors
                          border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Verify This Record
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* How It Works Section */}
      <div className="mt-8 bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h3 className="text-base font-semibold text-gray-100 mb-4 flex items-center gap-2">
          <Database className="h-5 w-5 text-blue-500" />
          How HealthChain Blockchain Works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StepCard
            step="1"
            title="Record Created"
            desc="When a doctor creates a visit, the SOAP note data (Subjective, Objective, Assessment, Plan) is hashed using SHA-256 to produce a unique fingerprint."
          />
          <StepCard
            step="2"
            title="Block Added"
            desc="The hash is stored in a new block that references the previous block's hash, creating an immutable chain. Any change to past data breaks the chain."
          />
          <StepCard
            step="3"
            title="Verification"
            desc="To verify integrity, the system re-hashes the current database data and compares it against the stored blockchain hash. Mismatches reveal tampering."
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, bg, valueColor = 'text-gray-900' }) {
  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <span className="text-xs text-gray-600 uppercase tracking-wide">{label}</span>
      </div>
      <div className={`text-xl font-bold ${valueColor}`}>{value}</div>
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
