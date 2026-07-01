import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { gsap } from 'gsap';
import toast from 'react-hot-toast';
import {
  CalendarCheck, Users, Activity, ClipboardList,
  ArrowRight, Calendar, Clock, User, FileText,
  ShieldCheck, Loader2, Stethoscope, TrendingUp,
  Link2, Zap, Heart, Thermometer, Wind, Weight,
  AlertCircle, Download, Settings, CheckCircle2,
} from 'lucide-react';
import { API_URL } from '../constants/api';
import { getCurrentDate } from '../utils/dateTime';

/* ── Animated counter using GSAP ── */
function CountUp({ target, duration = 1.4 }) {
  const elRef = useRef(null);
  const prev  = useRef(0);

  useEffect(() => {
    const obj = { val: prev.current };
    gsap.to(obj, {
      val: target,
      duration,
      ease: 'power2.out',
      onUpdate() {
        if (elRef.current) elRef.current.textContent = Math.round(obj.val);
      },
    });
    prev.current = target;
  }, [target, duration]);

  return <span ref={elRef}>0</span>;
}

/* ── Stat card ── */
function StatCard({ icon, label, value, colorClass, delay = 0 }) {
  const cardRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(cardRef.current,
      { opacity: 0, y: 24, scale: 0.96 },
      { opacity: 1, y: 0,  scale: 1, duration: 0.55, ease: 'power2.out', delay }
    );
  }, [delay]);

  return (
    <div ref={cardRef}
         className={`card-lift relative rounded-2xl p-5 overflow-hidden ${colorClass}`}>
      {/* Background shimmer */}
      <div className="absolute inset-0 animate-shimmer pointer-events-none opacity-50" />

      <div className="relative flex items-start justify-between mb-4">
        <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center
                        border border-white/8">
          {icon}
        </div>
        <TrendingUp className="h-4 w-4 text-white/20" />
      </div>

      <p className="text-3xl font-bold text-white tracking-tight">
        <CountUp target={value} />
      </p>
      <p className="text-xs font-medium text-white/50 mt-1 uppercase tracking-wider">
        {label}
      </p>
    </div>
  );
}

/* ── Quick action card ── */
function QuickLink({ to, icon, title, description, accentClass, delay = 0 }) {
  const ref = useRef(null);
  useEffect(() => {
    gsap.fromTo(ref.current,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out', delay }
    );
  }, [delay]);

  return (
    <Link ref={ref} to={to}
          className="card-lift glass-card group rounded-2xl p-5 block">
      <div className={`inline-flex h-10 w-10 rounded-xl items-center justify-center mb-3
                      ${accentClass} border border-white/8`}>
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-slate-200 mb-1 group-hover:text-white
                     transition-colors">
        {title}
      </h3>
      <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
      <div className="mt-3 flex items-center gap-1 text-xs font-medium text-blue-400
                      opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1
                      group-hover:translate-x-0 duration-200">
        Open <ArrowRight className="h-3 w-3" />
      </div>
    </Link>
  );
}

export default function DashboardHome({ token, user }) {
  const isDoctor = user?.role === 'doctor' || user?.role === 'admin';

  // ── Doctor state ─────────────────────────────────────────
  const [loading, setLoading]               = useState(true);
  const [stats, setStats]                   = useState({ todayAppointments: 0, completedThisWeek: 0, totalPatients: 0, upcomingAppointments: 0 });
  const [doctor, setDoctor]                 = useState(null);
  const [todaySchedule, setTodaySchedule]   = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  // ── Patient state ─────────────────────────────────────────
  const [patData, setPatData]   = useState(null);
  const [exporting, setExporting] = useState(false);

  const greetingRef = useRef(null);
  const authH = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    const ctrl = new AbortController();
    if (isDoctor) {
      axios.get(`${API_URL}/dashboard/stats`, { ...authH, signal: ctrl.signal })
        .then((res) => {
          setStats(res.data.stats);
          setDoctor(res.data.doctor);
          setTodaySchedule(res.data.todaySchedule);
          setRecentActivity(res.data.recentActivity);
        })
        .catch((err) => { if (!axios.isCancel(err)) console.error(err); })
        .finally(() => setLoading(false));
    } else {
      axios.get(`${API_URL}/patient/dashboard`, { ...authH, signal: ctrl.signal })
        .then((res) => {
          setPatData(res.data);
          // New-record notification
          const key = `hc_last_record_count_${user?.username}`;
          const prev = parseInt(localStorage.getItem(key) || '0', 10);
          const curr = res.data.totalRecords;
          if (curr > prev && prev > 0) {
            const newCount = curr - prev;
            toast(`🏥 ${newCount} new record${newCount > 1 ? 's' : ''} added to your file`, {
              duration: 5000,
              style: { background: '#1e3a5f', border: '1px solid #3b82f6', color: '#e2e8f0' },
            });
          }
          localStorage.setItem(key, String(curr));
        })
        .catch((err) => { if (!axios.isCancel(err)) console.error(err); })
        .finally(() => setLoading(false));
    }
    return () => ctrl.abort();
  }, [token, isDoctor]);

  /* Greeting entrance */
  useEffect(() => {
    if (!loading) {
      gsap.fromTo(greetingRef.current,
        { opacity: 0, y: -12 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
      );
    }
  }, [loading]);

  const formatTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hr = parseInt(h, 10);
    return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
  };

  const timeAgo = (ts) => {
    const d = Math.floor((Date.now() - new Date(ts)) / 60000);
    if (d < 1)  return 'just now';
    if (d < 60) return `${d}m ago`;
    const h = Math.floor(d / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const exportRecords = async () => {
    setExporting(true);
    try {
      const res = await axios.get(`${API_URL}/patient/export`, authH);
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `healthchain-records-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Records downloaded!');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const displayName = isDoctor
    ? doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}`.trim() : `Dr. ${user?.username}`
    : patData?.profile?.first_name && patData.profile.first_name !== 'Patient'
      ? patData.profile.first_name
      : user?.username;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <div className="relative">
          <div className="h-12 w-12 rounded-xl gradient-bg flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div className="absolute inset-0 rounded-xl gradient-bg animate-ping opacity-30" />
        </div>
        <p className="text-sm text-slate-500">Loading dashboard…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Greeting banner ── */}
      <div ref={greetingRef}
           className="relative rounded-2xl overflow-hidden glass-card p-6">
        {/* background glow */}
        <div className="absolute inset-0 bg-radial-blue pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-32 bg-indigo-500/10 blur-3xl
                        rounded-full pointer-events-none" />

        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-1">
              {getCurrentDate()}
            </p>
            <h1 className="text-2xl font-bold text-slate-100">
              {greeting},{' '}
              <span className="gradient-text">{displayName}</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {isDoctor
                ? `You have ${stats.todayAppointments} appointment${stats.todayAppointments !== 1 ? 's' : ''} today`
                : 'Your health records are secured on the blockchain'}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl
                          bg-emerald-500/10 border border-emerald-500/20">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-emerald-400">System Secure</span>
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      {isDoctor && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<CalendarCheck className="h-5 w-5 text-blue-300" />}
            label="Today's Appointments"
            value={stats.todayAppointments}
            colorClass="stat-card-blue"
            delay={0}
          />
          <StatCard
            icon={<Activity className="h-5 w-5 text-emerald-300" />}
            label="Completed This Week"
            value={stats.completedThisWeek}
            colorClass="stat-card-emerald"
            delay={0.08}
          />
          <StatCard
            icon={<Users className="h-5 w-5 text-violet-300" />}
            label="Total Patients"
            value={stats.totalPatients}
            colorClass="stat-card-violet"
            delay={0.16}
          />
          <StatCard
            icon={<ClipboardList className="h-5 w-5 text-amber-300" />}
            label="Upcoming"
            value={stats.upcomingAppointments}
            colorClass="stat-card-amber"
            delay={0.24}
          />
        </div>
      )}

      {/* ── Two-column: Schedule + Activity ── */}
      {isDoctor && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Today's Schedule */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4
                            border-b border-white/5">
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Calendar className="h-3.5 w-3.5 text-blue-400" />
                </div>
                Today&rsquo;s Schedule
              </h2>
              <Link to="/scheduler"
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center
                               gap-1 transition-colors">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {todaySchedule.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-2">
                <Calendar className="h-8 w-8 text-slate-700" />
                <p className="text-sm text-slate-600">No appointments today</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {todaySchedule.map((appt) => {
                  const name = appt.patient_first_name
                    ? `${appt.patient_first_name} ${appt.patient_last_name}`
                    : 'Unknown Patient';
                  return (
                    <div key={appt.id}
                         className="flex items-center gap-3 px-5 py-3
                                    hover:bg-white/3 transition-colors">
                      <div className="h-8 w-8 rounded-xl bg-blue-500/15 flex items-center
                                      justify-center shrink-0 border border-blue-500/20">
                        <User className="h-3.5 w-3.5 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-300 truncate">{name}</p>
                        <p className="text-xs text-slate-600 truncate">
                          {appt.reason_for_visit || 'No reason noted'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-500 shrink-0
                                      bg-white/5 rounded-lg px-2 py-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(appt.appointment_time)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4
                            border-b border-white/5">
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Zap className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                Recent Activity
              </h2>
              <Link to="/audit"
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center
                               gap-1 transition-colors">
                Full log <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-2">
                <Activity className="h-8 w-8 text-slate-700" />
                <p className="text-sm text-slate-600">No recent activity</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {recentActivity.map((act) => {
                  const isAdd    = act.type === 'ADD_RECORD';
                  const isVerify = act.type === 'VERIFY_INTEGRITY';
                  return (
                    <div key={act.id}
                         className="flex items-start gap-3 px-5 py-3
                                    hover:bg-white/3 transition-colors">
                      <div className={`mt-0.5 h-7 w-7 rounded-lg flex items-center
                                      justify-center shrink-0 border
                        ${isAdd
                          ? 'bg-emerald-500/15 border-emerald-500/20'
                          : isVerify
                          ? 'bg-blue-500/15 border-blue-500/20'
                          : 'bg-slate-700/50 border-slate-600/20'
                        }`}>
                        {isAdd    && <FileText   className="h-3.5 w-3.5 text-emerald-400" />}
                        {isVerify && <ShieldCheck className="h-3.5 w-3.5 text-blue-400"   />}
                        {!isAdd && !isVerify && <Activity className="h-3.5 w-3.5 text-slate-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-300 truncate">
                          {act.details || act.type}
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5">{timeAgo(act.timestamp)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Quick links (doctor) / Patient portal ── */}
      {isDoctor ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-600 mb-3">
            Quick Actions
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <QuickLink to="/clinical"  icon={<Stethoscope className="h-5 w-5 text-blue-400" />}   title="New Clinical Record"  description="Create a SOAP note for a patient visit"    accentClass="bg-blue-500/15"   delay={0}    />
            <QuickLink to="/patients"  icon={<Users className="h-5 w-5 text-violet-400" />}        title="Patient Directory"    description="Search and manage patient profiles"       accentClass="bg-violet-500/15" delay={0.07} />
            <QuickLink to="/scheduler" icon={<Calendar className="h-5 w-5 text-emerald-400" />}    title="Schedule Appointment" description="Book or manage upcoming visits"           accentClass="bg-emerald-500/15" delay={0.14} />
          </div>
        </div>
      ) : patData && (
        <PatientPortal
          data={patData}
          username={user?.username}
          onExport={exportRecords}
          exporting={exporting}
        />
      )}

      {/* ── Blockchain status strip ── */}
      {isDoctor && (
        <Link to="/blockchain"
              className="card-lift glass-card rounded-2xl p-4 flex items-center gap-4 group">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/15 border border-indigo-500/25
                          flex items-center justify-center shrink-0">
            <Link2 className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-200">Blockchain Integrity Monitor</p>
            <p className="text-xs text-slate-500">
              All medical records are SHA-256 hashed and stored on an immutable chain
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">Active</span>
            <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-blue-400
                                   group-hover:translate-x-0.5 transition-all" />
          </div>
        </Link>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Patient Portal — rendered instead of doctor dashboard
// ══════════════════════════════════════════════════════════════
function PatientPortal({ data, onExport, exporting }) {
  const { profile, latestVisit, totalRecords, upcomingAppointments, recentDiagnoses, isProfileComplete } = data;

  const formatDate = (d) => d
    ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';
  const formatTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hr = parseInt(h, 10);
    return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
  };
  const severityColor = (s) => ({
    mild:     'text-emerald-400 bg-emerald-500/10',
    moderate: 'text-amber-400 bg-amber-500/10',
    severe:   'text-red-400 bg-red-500/10',
    critical: 'text-red-500 bg-red-500/15',
  }[s] || 'text-slate-400 bg-slate-500/10');

  return (
    <div className="space-y-5">

      {/* Profile completeness banner */}
      {!isProfileComplete && (
        <div className="flex items-center gap-4 rounded-2xl border border-amber-500/30
                        bg-amber-950/20 px-5 py-4">
          <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-300">Complete your health profile</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Add your DOB, phone number, and emergency contact so your care team has accurate information.
            </p>
          </div>
          <Link to="/profile"
                className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl
                           bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs
                           font-semibold transition-colors">
            <Settings className="h-3.5 w-3.5" />
            Update Profile
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-300">{totalRecords}</p>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide">Medical Records</p>
        </div>
        <div className="glass-card rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-violet-300">{upcomingAppointments.length}</p>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide">Upcoming Appts</p>
        </div>
        <div className="glass-card rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-cyan-300">{profile.blood_type || '—'}</p>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide">Blood Type</p>
        </div>
      </div>

      {/* Latest Visit + Upcoming Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Latest Visit */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Heart className="h-3.5 w-3.5 text-blue-400" />
              </div>
              Latest Visit
            </h2>
            {latestVisit && (
              <span className="text-xs text-slate-500">{formatDate(latestVisit.visit_date)}</span>
            )}
          </div>

          {!latestVisit ? (
            <div className="flex flex-col items-center py-10 gap-2">
              <FileText className="h-8 w-8 text-slate-700" />
              <p className="text-sm text-slate-600">No visits recorded yet</p>
            </div>
          ) : (
            <div className="px-5 py-4 space-y-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Stethoscope className="h-3.5 w-3.5" />
                <span>Dr. {latestVisit.doctor_name}</span>
              </div>
              {latestVisit.condition_name && (
                <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${severityColor(latestVisit.severity)}`}>
                  {latestVisit.condition_name}
                </span>
              )}
              <div className="grid grid-cols-2 gap-2">
                <VitalTile icon={<Heart className="h-3.5 w-3.5 text-red-400" />}
                  label="BP" value={latestVisit.blood_pressure || '—'} />
                <VitalTile icon={<Activity className="h-3.5 w-3.5 text-blue-400" />}
                  label="HR" value={latestVisit.heart_rate ? `${latestVisit.heart_rate} bpm` : '—'} />
                <VitalTile icon={<Thermometer className="h-3.5 w-3.5 text-amber-400" />}
                  label="Temp" value={latestVisit.temperature ? `${latestVisit.temperature}°F` : '—'} />
                <VitalTile icon={<Wind className="h-3.5 w-3.5 text-cyan-400" />}
                  label="SpO₂" value={latestVisit.spo2 ? `${latestVisit.spo2}%` : '—'} />
              </div>
              {latestVisit.medication_name && (
                <div className="rounded-lg bg-slate-800/60 border border-slate-700/40 px-3 py-2">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Plan</p>
                  <p className="text-xs text-slate-300 line-clamp-2">{latestVisit.medication_name}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Upcoming Appointments */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Calendar className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              Upcoming Appointments
            </h2>
          </div>
          {upcomingAppointments.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-2">
              <Calendar className="h-8 w-8 text-slate-700" />
              <p className="text-sm text-slate-600">No upcoming appointments</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {upcomingAppointments.map((appt) => (
                <div key={appt.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="h-8 w-8 rounded-xl bg-emerald-500/15 border border-emerald-500/20
                                  flex items-center justify-center shrink-0">
                    <Stethoscope className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-300 truncate">Dr. {appt.doctor_name}</p>
                    <p className="text-xs text-slate-600 truncate">{appt.reason_for_visit || 'Appointment'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium text-slate-300">{formatDate(appt.appointment_date)}</p>
                    <p className="text-xs text-slate-600">{formatTime(appt.appointment_time)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Diagnoses */}
      {recentDiagnoses.length > 0 && (
        <div className="glass-card rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <ClipboardList className="h-3.5 w-3.5 text-violet-400" />
            </div>
            Recent Diagnoses
          </h2>
          <div className="flex flex-wrap gap-2">
            {recentDiagnoses.map((d, i) => (
              <span key={i} className={`text-xs px-3 py-1.5 rounded-full font-medium ${severityColor(d.severity)}`}>
                {d.condition_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <QuickLink to="/clinical" icon={<FileText className="h-5 w-5 text-blue-400" />}
          title="My Records" description="Full visit history with blockchain verification"
          accentClass="bg-blue-500/15" delay={0} />
        <QuickLink to="/profile" icon={<Settings className="h-5 w-5 text-violet-400" />}
          title={isProfileComplete ? 'My Profile' : 'Complete Profile'}
          description="Personal, contact, and insurance information"
          accentClass={isProfileComplete ? 'bg-violet-500/15' : 'bg-amber-500/15'} delay={0.07} />
        <div onClick={!exporting ? onExport : undefined}
             className="card-lift glass-card group rounded-2xl p-5 cursor-pointer">
          <div className="inline-flex h-10 w-10 rounded-xl items-center justify-center mb-3
                          bg-emerald-500/15 border border-white/8">
            {exporting
              ? <Loader2 className="h-5 w-5 text-emerald-400 animate-spin" />
              : <Download className="h-5 w-5 text-emerald-400" />}
          </div>
          <h3 className="text-sm font-semibold text-slate-200 mb-1 group-hover:text-white transition-colors">
            Export Records
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Download complete medical history as JSON
          </p>
        </div>
      </div>

      {/* Blockchain badge */}
      <div className="flex items-center gap-3 rounded-2xl border border-indigo-500/20
                      bg-indigo-950/10 px-5 py-3">
        <Link2 className="h-4 w-4 text-indigo-400 shrink-0" />
        <p className="text-xs text-slate-500 flex-1">
          All <span className="text-slate-300 font-medium">{totalRecords} records</span> are SHA-256 hashed
          and stored on an immutable blockchain ledger — tamper detection is automatic.
        </p>
        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
      </div>
    </div>
  );
}

function VitalTile({ icon, label, value }) {
  return (
    <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/40 rounded-lg px-3 py-2">
      {icon}
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-xs font-semibold text-slate-200">{value}</p>
      </div>
    </div>
  );
}
