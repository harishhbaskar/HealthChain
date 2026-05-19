import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Calendar,
  Clock,
  Plus,
  X,
  CheckCircle2,
  XCircle,
  User,
  FileText,
  Search,
  Filter,
  LayoutList,
  CalendarDays,
} from 'lucide-react';
import { API_URL } from '../../constants/api';
import Pagination from '../ui/Pagination';
import PatientSearch from '../ui/PatientSearch';
import CalendarView from './CalendarView';

const STATUS_STYLES = {
  Scheduled: 'bg-blue-500/20 text-blue-400',
  Completed: 'bg-emerald-500/20 text-emerald-400',
  Cancelled: 'bg-rose-500/20 text-rose-400',
  'No-Show': 'bg-amber-500/20 text-amber-400',
  Missed: 'bg-orange-500/20 text-orange-400',
};

const STATUS_OPTIONS = ['', 'Scheduled', 'Completed', 'Cancelled', 'No-Show'];
const LIMIT = 12;

export default function Scheduler({ token, patients: propPatients }) {
  const [appointments, setAppointments] = useState([]);
  const [allPatients, setAllPatients] = useState(propPatients || []);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    patient_id: '',
    appointment_date: '',
    appointment_time: '',
    reason_for_visit: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // View mode: 'list' or 'calendar'
  const [viewMode, setViewMode] = useState('list');

  // Pagination + filter state
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // Fetch full patient list on mount (don't rely solely on stale prop)
  useEffect(() => {
    const controller = new AbortController();

    const fetchPatients = async () => {
      try {
        const res = await axios.get(`${API_URL}/patients?limit=100`, {
          ...authHeaders,
          signal: controller.signal,
        });
        const list = res.data.data || res.data;
        if (list.length) setAllPatients(list);
      } catch (err) {
        if (!axios.isCancel(err)) {
          console.error('Scheduler: error fetching patients', err);
        }
      }
    };
    fetchPatients();

    return () => controller.abort();
  }, [token]);

  // Debounce search
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

  // Reset page on status filter change
  useEffect(() => { setPage(1); }, [statusFilter]);

  // ---- fetch appointments ----
  const fetchAppointments = useCallback(async (signal = undefined) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (statusFilter) params.set('status', statusFilter);
      const config = { ...authHeaders };
      if (signal) config.signal = signal;
      const res = await axios.get(`${API_URL}/appointments?${params}`, config);
      setAppointments(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      if (!axios.isCancel(err)) {
        console.error('Error fetching appointments', err);
      }
    } finally {
      setLoading(false);
    }
  }, [token, page, debouncedSearch, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    fetchAppointments(controller.signal);
    return () => controller.abort();
  }, [fetchAppointments]);

  // ---- book appointment ----
  const handleBook = async (e) => {
    e.preventDefault();
    if (!form.patient_id || !form.appointment_date || !form.appointment_time) {
      toast.error('Please fill in patient, date, and time.');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/appointments`, form, authHeaders);
      setShowModal(false);
      setForm({ patient_id: '', appointment_date: '', appointment_time: '', reason_for_visit: '' });
      fetchAppointments();
      toast.success('Appointment booked!');
    } catch (err) {
      toast.error('Failed to book appointment: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // ---- update status ----
  const changeStatus = async (id, status) => {
    try {
      await axios.put(`${API_URL}/appointments/${id}/status`, { status }, authHeaders);
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a))
      );
      toast.success(`Appointment ${status.toLowerCase()}`);
    } catch (err) {
      toast.error('Failed to update status: ' + (err.response?.data?.error || err.message));
    }
  };

  // ---- helpers ----
  const formatDate = (d) => {
    if (!d) return '';
    // Parse as local date (YYYY-MM-DD) without timezone conversion
    const [year, month, day] = d.split('T')[0].split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  // Split into upcoming vs past/completed
  const todayStr = new Date().toISOString().slice(0, 10);
  const upcoming = appointments.filter(
    (a) => a.status === 'Scheduled' && a.appointment_date?.slice(0, 10) >= todayStr
  );
  const past = appointments.filter(
    (a) => a.status !== 'Scheduled' || a.appointment_date?.slice(0, 10) < todayStr
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-500" />
            Appointment Scheduler
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {pagination.total} total appointment{pagination.total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-gray-800 border border-gray-700 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${
                viewMode === 'list'
                  ? 'bg-gray-700 text-gray-100'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" /> List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${
                viewMode === 'calendar'
                  ? 'bg-gray-700 text-gray-100'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Calendar
            </button>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="h-4 w-4" />
            Book Appointment
          </button>
        </div>
      </div>

      {/* ─── Calendar View ─── */}
      {viewMode === 'calendar' && (
        <CalendarView token={token} />
      )}

      {/* ─── List View ─── */}
      {viewMode === 'list' && (
        <>
          {/* Search + Status Filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search patient or reason…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-9 pr-8 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.filter(Boolean).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <p className="text-center text-gray-500 py-12">Loading appointments…</p>
      )}

      {/* Appointments */}
      {!loading && (
        <>
          {appointments.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-12">No appointments found.</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {appointments.map((appt) => {
              const isPast = appt.status !== 'Scheduled' || appt.appointment_date?.slice(0, 10) < todayStr;
              return (
                <AppointmentCard
                  key={appt.id}
                  appt={appt}
                  formatDate={formatDate}
                  formatTime={formatTime}
                  onComplete={() => changeStatus(appt.id, 'Completed')}
                  onCancel={() => changeStatus(appt.id, 'Cancelled')}
                  past={isPast}
                />
              );
            })}
          </div>

          <Pagination
            page={page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            onPageChange={setPage}
          />
        </>
      )}
        </>
      )}

      {/* Book Appointment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-md w-full mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gray-900 px-6 py-4 text-white flex items-center justify-between border-b border-gray-700">
              <h2 className="text-lg font-bold flex items-center gap-2 text-gray-100">
                <Plus className="h-5 w-5 text-blue-500" />
                Book New Appointment
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-300 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleBook} className="px-6 py-5 space-y-4">
              {/* Patient Select */}
              <PatientSearch
                patients={allPatients}
                selectedPatientId={form.patient_id}
                onSelect={(id) => setForm({ ...form, patient_id: String(id) })}
                compact
              />

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Date</label>
                  <input
                    type="date"
                    value={form.appointment_date}
                    onChange={(e) => setForm({ ...form, appointment_date: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Time</label>
                  <input
                    type="time"
                    value={form.appointment_time}
                    onChange={(e) => setForm({ ...form, appointment_time: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Reason for Visit
                </label>
                <textarea
                  value={form.reason_for_visit}
                  onChange={(e) => setForm({ ...form, reason_for_visit: e.target.value })}
                  rows={3}
                  placeholder="e.g. Follow-up on blood work, routine checkup…"
                  className="w-full bg-gray-900 border border-gray-700 text-gray-100 placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-600 rounded-lg hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {submitting ? 'Booking…' : 'Book Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Appointment Card Sub-component ----
function AppointmentCard({ appt, formatDate, formatTime, onComplete, onCancel, past }) {
  // If still "Scheduled" but the date has passed, show as "Missed"
  const todayStr = new Date().toISOString().slice(0, 10);
  const isPastScheduled = appt.status === 'Scheduled' && appt.appointment_date?.slice(0, 10) < todayStr;
  const displayStatus = isPastScheduled ? 'Missed' : appt.status;

  const patientName = appt.patient_first_name
    ? `${appt.patient_first_name} ${appt.patient_last_name}`
    : appt.doctor_first_name
    ? `Dr. ${appt.doctor_first_name === 'Dr.' ? '' : appt.doctor_first_name + ' '}${appt.doctor_last_name}`.trim()
    : 'Unknown';

  return (
    <div
      className={`bg-gray-800 border rounded-xl p-5 ${
        past ? 'opacity-60 border-gray-700' : 'border-gray-700 hover:border-gray-600 transition'
      }`}
    >
      {/* Top row: patient + status badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-blue-500/20 flex items-center justify-center">
            <User className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-100 text-sm">{patientName}</p>
            {appt.patient_phone && (
              <p className="text-xs text-gray-500">{appt.patient_phone}</p>
            )}
          </div>
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            STATUS_STYLES[displayStatus] || 'bg-gray-700 text-gray-300'
          }`}
        >
          {displayStatus}
        </span>
      </div>

      {/* Date/time */}
      <div className="flex items-center gap-4 text-sm text-gray-400 mb-2">
        <span className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5 text-gray-500" />
          {formatDate(appt.appointment_date)}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 text-gray-500" />
          {formatTime(appt.appointment_time)}
        </span>
      </div>

      {/* Reason */}
      {appt.reason_for_visit && (
        <div className="flex items-start gap-1.5 text-sm text-gray-500 mb-3">
          <FileText className="h-3.5 w-3.5 mt-0.5 text-gray-600 shrink-0" />
          <span className="line-clamp-2">{appt.reason_for_visit}</span>
        </div>
      )}

      {/* Action buttons (only for upcoming, non-past) */}
      {!past && appt.status === 'Scheduled' && (
        <div className="flex gap-2 pt-2 border-t border-gray-700 mt-1">
          <button
            onClick={onComplete}
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Complete
          </button>
          <button
            onClick={onCancel}
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition"
          >
            <XCircle className="h-3.5 w-3.5" />
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
