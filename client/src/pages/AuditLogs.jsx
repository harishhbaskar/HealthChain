import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Shield, RefreshCw, Search, Filter } from 'lucide-react';
import { API_URL } from '../constants/api';
import Pagination from '../components/ui/Pagination';
import { formatTimestamp } from '../utils/dateTime';

const LIMIT = 20;
const ACTION_TYPES = ['', 'ADD_RECORD', 'VERIFY_INTEGRITY', 'VIEW_HISTORY'];

export default function AuditLogs({ token }) {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => { setPage(1); }, [actionFilter]);

  const fetchLogs = useCallback(async (signal) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (actionFilter) params.set('action', actionFilter);
      const res = await axios.get(`${API_URL}/audit-logs?${params}`, {
        ...authHeaders,
        signal,
      });
      setLogs(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      if (!axios.isCancel(err)) {
        console.error('Error fetching audit logs', err);
      }
    } finally {
      setLoading(false);
    }
  }, [token, page, debouncedSearch, actionFilter]);

  useEffect(() => {
    const controller = new AbortController();
    fetchLogs(controller.signal);
    return () => controller.abort();
  }, [fetchLogs]);

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
      <div className="px-5 py-4 border-b border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            HIPAA Compliance Audit Trail
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Every data access and modification is recorded for regulatory compliance.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 bg-gray-900 border border-gray-700 rounded-lg hover:bg-gray-700 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Search + Action Filter */}
      <div className="px-5 py-3 border-b border-gray-700 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search user or details…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="pl-9 pr-8 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
          >
            <option value="">All Actions</option>
            {ACTION_TYPES.filter(Boolean).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Action
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Details
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                IP Address
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-700/50 transition-colors">
                <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">
                  {formatTimestamp(log.timestamp)}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-100 whitespace-nowrap">
                  {log.username || 'Unknown'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      log.action_type === 'ADD_RECORD'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : log.action_type === 'VERIFY_INTEGRITY'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    {log.action_type}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-400">{log.details}</td>
                <td className="px-4 py-3 text-sm text-gray-500 font-mono whitespace-nowrap">
                  {log.ip_address}
                </td>
              </tr>
            ))}
            {!loading && !logs.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No audit logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 border-t border-gray-700">
        <Pagination
          page={page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
