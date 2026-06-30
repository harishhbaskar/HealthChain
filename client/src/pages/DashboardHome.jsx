import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { gsap } from 'gsap';
import {
  CalendarCheck, Users, Activity, ClipboardList,
  ArrowRight, Calendar, Clock, User, FileText,
  ShieldCheck, Loader2, Stethoscope, TrendingUp,
  Link2, Zap,
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

  const [loading, setLoading]           = useState(true);
  const [stats, setStats]               = useState({ todayAppointments: 0, completedThisWeek: 0, totalPatients: 0, upcomingAppointments: 0 });
  const [doctor, setDoctor]             = useState(null);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const greetingRef = useRef(null);

  useEffect(() => {
    if (!isDoctor) { setLoading(false); return; }
    const ctrl = new AbortController();
    axios.get(`${API_URL}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: ctrl.signal,
    }).then((res) => {
      setStats(res.data.stats);
      setDoctor(res.data.doctor);
      setTodaySchedule(res.data.todaySchedule);
      setRecentActivity(res.data.recentActivity);
    }).catch((err) => {
      if (!axios.isCancel(err)) console.error(err);
    }).finally(() => setLoading(false));
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

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const displayName = isDoctor
    ? doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}`.trim() : `Dr. ${user?.username}`
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

      {/* ── Quick links ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-600 mb-3">
          Quick Actions
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {isDoctor ? (
            <>
              <QuickLink
                to="/clinical"
                icon={<Stethoscope className="h-5 w-5 text-blue-400" />}
                title="New Clinical Record"
                description="Create a SOAP note for a patient visit"
                accentClass="bg-blue-500/15"
                delay={0}
              />
              <QuickLink
                to="/patients"
                icon={<Users className="h-5 w-5 text-violet-400" />}
                title="Patient Directory"
                description="Search and manage patient profiles"
                accentClass="bg-violet-500/15"
                delay={0.07}
              />
              <QuickLink
                to="/scheduler"
                icon={<Calendar className="h-5 w-5 text-emerald-400" />}
                title="Schedule Appointment"
                description="Book or manage upcoming visits"
                accentClass="bg-emerald-500/15"
                delay={0.14}
              />
            </>
          ) : (
            <QuickLink
              to="/clinical"
              icon={<FileText className="h-5 w-5 text-blue-400" />}
              title="My Medical Records"
              description="View your visit history secured on blockchain"
              accentClass="bg-blue-500/15"
              delay={0}
            />
          )}
        </div>
      </div>

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
