import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  ArrowLeft, User, Phone, Mail, MapPin, ShieldAlert, Heart,
  Stethoscope, Calendar, Pill, Activity, FileText, Clock,
  Plus, X, CalendarPlus, Thermometer
} from 'lucide-react';
import { API_URL } from '../constants/api';

const TABS = ['Overview', 'Visit History', 'Appointments'];

const INITIAL_APPT = { date: '', time: '', reason: '' };
const INITIAL_SOAP = {
  subjective: '',
  vitals: { bp: '', hr: '', temp: '' },
  assessment: '',
  plan: '',
};

export default function PatientProfile({ token }) {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [visits, setVisits] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(true);

  // Quick-action form visibility
  const [showApptForm, setShowApptForm] = useState(false);
  const [showVisitForm, setShowVisitForm] = useState(false);

  // Form state
  const [apptForm, setApptForm] = useState(INITIAL_APPT);
  const [soapForm, setSoapForm] = useState(INITIAL_SOAP);
  const [submitting, setSubmitting] = useState(false);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const refreshTimeline = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/patients/${id}/timeline`, authHeaders);
      setVisits(res.data.visits || []);
      setAppointments(res.data.appointments || []);
    } catch (err) {
      console.error('Error refreshing timeline', err);
    }
  }, [id, token]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        const [patientRes, timelineRes] = await Promise.all([
          axios.get(`${API_URL}/patients/${id}`, { ...authHeaders, signal: controller.signal }),
          axios.get(`${API_URL}/patients/${id}/timeline`, { ...authHeaders, signal: controller.signal }),
        ]);
        setPatient(patientRes.data);
        setVisits(timelineRes.data.visits || []);
        setAppointments(timelineRes.data.appointments || []);
      } catch (err) {
        if (!axios.isCancel(err)) {
          console.error('Error fetching patient profile', err);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    return () => controller.abort();
  }, [id, token]);

  // ── Quick Action Handlers ──
  const handleBookAppointment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(
        `${API_URL}/appointments`,
        {
          patient_id: Number(id),
          appointment_date: apptForm.date,
          appointment_time: apptForm.time,
          reason_for_visit: apptForm.reason,
        },
        authHeaders
      );
      toast.success('Appointment booked!');
      setApptForm(INITIAL_APPT);
      setShowApptForm(false);
      setActiveTab('Appointments');
      await refreshTimeline();
    } catch (err) {
      toast.error('Failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddVisit = async (e) => {
    e.preventDefault();
    if (!soapForm.assessment.trim()) {
      toast.error('Assessment (Diagnosis) is required.');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(
        `${API_URL}/records`,
        {
          patient_id: Number(id),
          subjective: soapForm.subjective,
          vitals: soapForm.vitals,
          assessment: soapForm.assessment,
          plan: soapForm.plan,
        },
        authHeaders
      );
      toast.success('Visit record saved to Blockchain!');
      setSoapForm(INITIAL_SOAP);
      setShowVisitForm(false);
      setActiveTab('Visit History');
      await refreshTimeline();
    } catch (err) {
      toast.error('Failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // Helpers
  const calculateAge = (dob) => {
    if (!dob) return 'N/A';
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  };

  const formatDate = (d) => {
    if (!d) return 'N/A';
    const [year, month, day] = d.split('T')[0].split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${hour % 12 || 12}:${m} ${ampm}`;
  };

  const statusColor = (s) => {
    const map = {
      scheduled: 'bg-blue-500/20 text-blue-400',
      completed: 'bg-green-500/20 text-green-400',
      cancelled: 'bg-red-500/20 text-red-400',
      'no-show': 'bg-yellow-500/20 text-yellow-400',
    };
    return map[s] || 'bg-gray-500/20 text-gray-400';
  };

  if (loading) {
    return <p className="text-center text-gray-500 py-20">Loading patient profile…</p>;
  }

  if (!patient) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">Patient not found.</p>
        <Link to="/patients" className="text-blue-400 hover:text-blue-300 text-sm">
          &larr; Back to directory
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back link */}
      <Link
        to="/patients"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 mb-6 transition"
      >
        <ArrowLeft className="h-4 w-4" /> Back to directory
      </Link>

      {/* Patient Header Card */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <User className="h-8 w-8 text-blue-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-100">
              {patient.first_name} {patient.last_name}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-400 mt-1">
              <span>{formatDate(patient.date_of_birth)} &middot; Age {calculateAge(patient.date_of_birth)}</span>
              <span>{patient.gender || 'N/A'}</span>
              <span>Blood: {patient.blood_type || 'N/A'}</span>
            </div>
          </div>
          <div className="flex gap-3 text-sm">
            <StatPill label="Visits" value={visits.length} color="text-emerald-400" />
            <StatPill label="Appointments" value={appointments.length} color="text-blue-400" />
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex gap-3 mt-5 pt-5 border-t border-gray-700">
          <button
            onClick={() => { setShowApptForm(!showApptForm); setShowVisitForm(false); }}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition ${
              showApptForm
                ? 'bg-blue-600 text-white'
                : 'bg-gray-900 text-gray-300 border border-gray-600 hover:bg-gray-700'
            }`}
          >
            <CalendarPlus className="h-4 w-4" />
            Book Appointment
          </button>
          <button
            onClick={() => { setShowVisitForm(!showVisitForm); setShowApptForm(false); }}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition ${
              showVisitForm
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-900 text-gray-300 border border-gray-600 hover:bg-gray-700'
            }`}
          >
            <Plus className="h-4 w-4" />
            New Visit
          </button>
        </div>
      </div>

      {/* ── Inline Book Appointment Form ── */}
      {showApptForm && (
        <div className="bg-gray-800 border border-blue-500/30 rounded-xl p-5 mb-6 border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
              <CalendarPlus className="h-4 w-4 text-blue-400" /> Book Appointment for {patient.first_name}
            </h3>
            <button onClick={() => setShowApptForm(false)} className="text-gray-500 hover:text-gray-300">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleBookAppointment} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date *</label>
              <input
                type="date"
                required
                value={apptForm.date}
                onChange={(e) => setApptForm((p) => ({ ...p, date: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Time *</label>
              <input
                type="time"
                required
                value={apptForm.time}
                onChange={(e) => setApptForm((p) => ({ ...p, time: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Reason</label>
              <input
                type="text"
                value={apptForm.reason}
                onChange={(e) => setApptForm((p) => ({ ...p, reason: e.target.value }))}
                placeholder="e.g. Follow-up"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="sm:col-span-3 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition"
              >
                <CalendarPlus className="h-4 w-4" />
                {submitting ? 'Booking…' : 'Book Appointment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Inline New Visit (SOAP) Form ── */}
      {showVisitForm && (
        <div className="bg-gray-800 border border-emerald-500/30 rounded-xl p-5 mb-6 border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-emerald-400" /> New Visit for {patient.first_name}
            </h3>
            <button onClick={() => setShowVisitForm(false)} className="text-gray-500 hover:text-gray-300">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleAddVisit} className="space-y-4">
            {/* Subjective */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Subjective (Symptoms)</label>
              <textarea
                rows={2}
                value={soapForm.subjective}
                onChange={(e) => setSoapForm((p) => ({ ...p, subjective: e.target.value }))}
                placeholder="Patient complaints…"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Vitals */}
            <fieldset className="border border-gray-700 rounded-lg p-3">
              <legend className="text-xs font-medium text-gray-500 px-1">Objective — Vitals</legend>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 flex items-center gap-1">
                    <Activity className="h-3 w-3" /> Blood Pressure
                  </label>
                  <input
                    type="text"
                    placeholder="120/80"
                    value={soapForm.vitals.bp}
                    onChange={(e) => setSoapForm((p) => ({ ...p, vitals: { ...p.vitals, bp: e.target.value } }))}
                    className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 flex items-center gap-1">
                    <Heart className="h-3 w-3" /> Heart Rate (bpm)
                  </label>
                  <input
                    type="number"
                    placeholder="72"
                    value={soapForm.vitals.hr}
                    onChange={(e) => setSoapForm((p) => ({ ...p, vitals: { ...p.vitals, hr: e.target.value } }))}
                    className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 flex items-center gap-1">
                    <Thermometer className="h-3 w-3" /> Temperature (°F)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="98.6"
                    value={soapForm.vitals.temp}
                    onChange={(e) => setSoapForm((p) => ({ ...p, vitals: { ...p.vitals, temp: e.target.value } }))}
                    className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
            </fieldset>

            {/* Assessment + Plan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Assessment (Diagnosis) *</label>
                <input
                  type="text"
                  required
                  value={soapForm.assessment}
                  onChange={(e) => setSoapForm((p) => ({ ...p, assessment: e.target.value }))}
                  placeholder="Diagnosis…"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Plan (Treatment)</label>
                <input
                  type="text"
                  value={soapForm.plan}
                  onChange={(e) => setSoapForm((p) => ({ ...p, plan: e.target.value }))}
                  placeholder="Treatment plan…"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition"
              >
                <Plus className="h-4 w-4" />
                {submitting ? 'Saving…' : 'Save to Chain'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-800/50 p-1 rounded-lg w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition ${
              activeTab === tab
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'Overview' && <OverviewTab patient={patient} />}
      {activeTab === 'Visit History' && (
        <VisitHistoryTab visits={visits} formatDate={formatDate} />
      )}
      {activeTab === 'Appointments' && (
        <AppointmentsTab
          appointments={appointments}
          formatDate={formatDate}
          formatTime={formatTime}
          statusColor={statusColor}
        />
      )}
    </div>
  );
}

/* ── Stat Pill ── */
function StatPill({ label, value, color }) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-center">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

/* ── Overview Tab ── */
function OverviewTab({ patient }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <InfoCard title="Contact Information">
        <DetailRow icon={<Phone className="h-4 w-4" />} label="Phone" value={patient.phone_number} />
        <DetailRow icon={<Mail className="h-4 w-4" />} label="Email" value={patient.email} />
        <DetailRow icon={<MapPin className="h-4 w-4" />} label="Address" value={patient.address} />
      </InfoCard>

      <InfoCard title="Emergency & Insurance">
        <DetailRow
          icon={<ShieldAlert className="h-4 w-4" />}
          label="Emergency Contact"
          value={
            patient.emergency_contact_name
              ? `${patient.emergency_contact_name} — ${patient.emergency_contact_phone || 'N/A'}`
              : null
          }
        />
        <DetailRow
          icon={<Heart className="h-4 w-4" />}
          label="Insurance Provider"
          value={patient.insurance_provider}
        />
      </InfoCard>
    </div>
  );
}

/* ── Visit History Tab ── */
function VisitHistoryTab({ visits, formatDate }) {
  if (visits.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p>No visit records found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {visits.map((v) => (
        <div
          key={v.visit_id}
          className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-gray-600 transition"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-emerald-400 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-100">{v.chief_complaint || 'General Visit'}</h3>
                <p className="text-xs text-gray-500">
                  {formatDate(v.visit_date)} {v.doctor_name ? `· Dr. ${v.doctor_name}` : ''}
                </p>
              </div>
            </div>
            {v.record_hash && (
              <span className="text-[10px] font-mono text-gray-600 bg-gray-900 px-2 py-1 rounded">
                #{v.record_hash.substring(0, 8)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            {/* Vitals */}
            <div className="bg-gray-900/60 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                <Activity className="h-3 w-3" /> Vitals
              </p>
              <p className="text-gray-300">
                BP {v.blood_pressure || '—'} · HR {v.heart_rate || '—'} · Temp {v.temperature || '—'}
              </p>
            </div>

            {/* Diagnosis */}
            <div className="bg-gray-900/60 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                <FileText className="h-3 w-3" /> Diagnosis
              </p>
              <p className="text-gray-300">{v.condition_name || '—'}</p>
            </div>

            {/* Prescription */}
            <div className="bg-gray-900/60 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                <Pill className="h-3 w-3" /> Prescription
              </p>
              <p className="text-gray-300">{v.medication_name || '—'}</p>
              {v.instructions && (
                <p className="text-xs text-gray-500 mt-0.5">{v.instructions}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Appointments Tab ── */
function AppointmentsTab({ appointments, formatDate, formatTime, statusColor }) {
  if (appointments.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p>No appointments found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((a) => (
        <div
          key={a.appointment_id}
          className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center gap-4 hover:border-gray-600 transition"
        >
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <Calendar className="h-5 w-5 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-100 truncate">
              {a.reason_for_visit || 'Appointment'}
            </p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(a.appointment_date)} {formatTime(a.appointment_time)}
              {a.doctor_name ? ` · Dr. ${a.doctor_name}` : ''}
            </p>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor(a.status)}`}>
            {a.status}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Shared Helpers ── */
function InfoCard({ title, children }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-gray-500">{icon}</span>
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-sm text-gray-200">{value || 'Not provided'}</p>
      </div>
    </div>
  );
}
