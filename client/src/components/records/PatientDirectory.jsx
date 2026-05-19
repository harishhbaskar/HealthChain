import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Search, User, Phone, ChevronRight } from 'lucide-react';
import { API_URL } from '../../constants/api';
import Pagination from '../ui/Pagination';

const LIMIT = 12;

export default function PatientDirectory({ token }) {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);

  // Debounce search input
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

  const fetchPatients = useCallback(async (signal = undefined) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (debouncedSearch) params.set('search', debouncedSearch);
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (signal) config.signal = signal;
      const res = await axios.get(`${API_URL}/patients?${params}`, config);
      setPatients(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      if (!axios.isCancel(err)) {
        console.error('Error fetching patients', err);
      }
    } finally {
      setLoading(false);
    }
  }, [token, page, debouncedSearch]);

  useEffect(() => {
    const controller = new AbortController();
    fetchPatients(controller.signal);
    return () => controller.abort();
  }, [fetchPatients]);

  return (
    <div>
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search by name or phone number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {pagination.total} patient{pagination.total !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Loading / Empty */}
      {loading && (
        <p className="text-center text-gray-500 py-12">Loading patients…</p>
      )}

      {!loading && patients.length === 0 && (
        <p className="text-center text-gray-500 py-12">No patients match your search.</p>
      )}

      {/* Patient Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {patients.map((patient) => (
          <Link
            key={patient.id}
            to={`/patients/${patient.id}`}
            className="text-left bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-blue-500/50 hover:bg-gray-800/80 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <User className="h-5 w-5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-100">
                  {patient.first_name} {patient.last_name}
                </h3>
                <p className="text-xs text-gray-500">
                  {formatDob(patient.date_of_birth)} &middot; Age {calculateAge(patient.date_of_birth)}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-600" />
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Phone className="h-4 w-4 text-gray-500" />
              {patient.phone_number || 'No phone'}
            </div>
          </Link>
        ))}
      </div>

      <Pagination
        page={page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        onPageChange={setPage}
      />
    </div>
  );
}

function calculateAge(dob) {
  if (!dob) return 'N/A';
  const birth = new Date(dob);
  const diff = Date.now() - birth.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

function formatDob(dob) {
  if (!dob) return 'N/A';
  // Parse as local date without timezone conversion
  const [year, month, day] = dob.split('T')[0].split('-');
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
