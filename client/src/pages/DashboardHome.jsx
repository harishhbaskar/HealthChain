import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  CalendarCheck,
  Users,
  Activity,
  ClipboardList,
  ArrowRight,
  Calendar,
  Clock,
  User,
  FileText,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { API_URL } from '../constants/api';
import { getCurrentDate } from '../utils/dateTime';

export default function DashboardHome({ token, user }) {
  const isDoctor = user?.role === 'doctor' || user?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayAppointments: 0,
    completedThisWeek: 0,
    totalPatients: 0,
    upcomingAppointments: 0,
  });
  const [doctor, setDoctor] = useState(null);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    if (!isDoctor) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchStats = async () => {
      try {
        const res = await axios.get(`${API_URL}/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        setStats(res.data.stats);
        setDoctor(res.data.doctor);
        setTodaySchedule(res.data.todaySchedule);
        setRecentActivity(res.data.recentActivity);
      } catch (err) {
        if (!axios.isCancel(err)) {
          console.error('Error fetching dashboard stats', err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    return () => controller.abort();
  }, [token, isDoctor]);

  const formatTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  const timeAgo = (timestamp) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  // ---- greeting ----
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const displayName = isDoctor
    ? doctor
      ? `Dr. ${doctor.first_name === 'Dr.' ? '' : doctor.first_name + ' '}${doctor.last_name}`.trim()
      : `Dr. ${user?.username}`
    : user?.username;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100">
          {greeting}, {displayName}
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          {getCurrentDate()}
        </p>
      </div>

      {/* Stat Cards */}
      {isDoctor && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<CalendarCheck className="h-6 w-6 text-blue-400" />}
            label="Today's Appointments"
            value={stats.todayAppointments}
            bg="bg-blue-500/10 border-blue-500/20"
          />
          <StatCard
            icon={<Activity className="h-6 w-6 text-emerald-400" />}
            label="Completed This Week"
            value={stats.completedThisWeek}
            bg="bg-emerald-500/10 border-emerald-500/20"
          />
          <StatCard
            icon={<Users className="h-6 w-6 text-violet-400" />}
            label="Total Patients"
            value={stats.totalPatients}
            bg="bg-violet-500/10 border-violet-500/20"
          />
          <StatCard
            icon={<ClipboardList className="h-6 w-6 text-amber-400" />}
            label="Upcoming Appointments"
            value={stats.upcomingAppointments}
            bg="bg-amber-500/10 border-amber-500/20"
          />
        </div>
      )}

      {/* Two-column layout: Today's Schedule + Recent Activity */}
      {isDoctor && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Today's Schedule */}
          <div className="bg-gray-800 rounded-xl border border-gray-700">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
              <h2 className="text-base font-semibold text-gray-100 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                Today&rsquo;s Schedule
              </h2>
              <Link
                to="/scheduler"
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {todaySchedule.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-500 text-sm">
                No appointments scheduled for today.
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {todaySchedule.map((appt) => {
                  const name = appt.patient_first_name
                    ? `${appt.patient_first_name} ${appt.patient_last_name}`
                    : 'Unknown Patient';

                  return (
                    <div
                      key={appt.id}
                      className="flex items-center gap-4 px-5 py-3 hover:bg-gray-700/40 transition-colors"
                    >
                      <div className="h-9 w-9 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-200 truncate">
                          {name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {appt.reason_for_visit || 'No reason noted'}
                        </p>
                      </div>
                      <div className="text-sm text-gray-400 flex items-center gap-1 shrink-0">
                        <Clock className="h-3.5 w-3.5" />
                        {formatTime(appt.appointment_time)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Activity Feed */}
          <div className="bg-gray-800 rounded-xl border border-gray-700">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
              <h2 className="text-base font-semibold text-gray-100 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-emerald-500" />
                Recent Activity
              </h2>
              <Link
                to="/audit"
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
              >
                Full log <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {recentActivity.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-500 text-sm">
                No recent activity.
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {recentActivity.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-start gap-3 px-5 py-3 hover:bg-gray-700/40 transition-colors"
                  >
                    <div className="mt-0.5 shrink-0">
                      {act.type === 'ADD_RECORD' ? (
                        <div className="h-7 w-7 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <FileText className="h-3.5 w-3.5 text-emerald-400" />
                        </div>
                      ) : act.type === 'VERIFY_INTEGRITY' ? (
                        <div className="h-7 w-7 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
                        </div>
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-gray-700 flex items-center justify-center">
                          <Activity className="h-3.5 w-3.5 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-300 truncate">
                        {act.details || act.type}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {timeAgo(act.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isDoctor && (
          <>
            <QuickLink
              to="/clinical"
              icon={<Activity className="h-5 w-5 text-blue-400" />}
              title="New Clinical Record"
              description="Create a SOAP note for a patient visit"
            />
            <QuickLink
              to="/patients"
              icon={<Users className="h-5 w-5 text-violet-400" />}
              title="Patient Directory"
              description="Search and manage patient profiles"
            />
            <QuickLink
              to="/scheduler"
              icon={<Calendar className="h-5 w-5 text-emerald-400" />}
              title="Schedule Appointment"
              description="Book or manage upcoming visits"
            />
          </>
        )}

        {!isDoctor && (
          <QuickLink
            to="/clinical"
            icon={<Activity className="h-5 w-5 text-blue-400" />}
            title="My Medical Records"
            description="View your visit history and prescriptions"
          />
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, bg }) {
  return (
    <div className={`rounded-xl border p-5 ${bg}`}>
      <div className="flex items-center justify-between mb-3">{icon}</div>
      <p className="text-2xl font-bold text-gray-100">{value}</p>
      <p className="text-sm text-gray-400 mt-1">{label}</p>
    </div>
  );
}

function QuickLink({ to, icon, title, description }) {
  return (
    <Link
      to={to}
      className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-blue-500/50 hover:bg-gray-800/80 transition-all group"
    >
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <h3 className="text-sm font-semibold text-gray-200 group-hover:text-gray-100">
          {title}
        </h3>
      </div>
      <p className="text-xs text-gray-500">{description}</p>
    </Link>
  );
}
