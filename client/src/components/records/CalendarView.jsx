import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Clock, User } from 'lucide-react';
import { API_URL } from '../../constants/api';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_DOT = {
  Scheduled: 'bg-blue-400',
  Completed: 'bg-emerald-400',
  Cancelled: 'bg-rose-400',
  'No-Show': 'bg-amber-400',
};

const STATUS_BADGE = {
  Scheduled: 'bg-blue-500/20 text-blue-400',
  Completed: 'bg-emerald-500/20 text-emerald-400',
  Cancelled: 'bg-rose-500/20 text-rose-400',
  'No-Show': 'bg-amber-500/20 text-amber-400',
};

export default function CalendarView({ token }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const fetchMonth = useCallback(async (signal = undefined) => {
    setLoading(true);
    try {
      const config = { ...authHeaders };
      if (signal) config.signal = signal;
      const res = await axios.get(
        `${API_URL}/appointments/month?year=${year}&month=${month}`,
        config
      );
      setAppointments(res.data);
    } catch (err) {
      if (!axios.isCancel(err)) {
        console.error('Error fetching month appointments', err);
      }
    } finally {
      setLoading(false);
    }
  }, [token, year, month]);

  useEffect(() => {
    const controller = new AbortController();
    fetchMonth(controller.signal);
    return () => controller.abort();
  }, [fetchMonth]);

  // Navigate months
  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
    setSelectedDate(null);
  };
  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth() + 1);
    setSelectedDate(todayStr);
  };

  // Calendar grid math
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const monthLabel = new Date(year, month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  // Group appointments by date string (YYYY-MM-DD)
  const byDate = {};
  appointments.forEach((a) => {
    const key = a.appointment_date?.slice(0, 10);
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(a);
  });

  // Build cells
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null); // leading blanks
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  // Selected day appointments
  const selectedAppts = selectedDate ? (byDate[selectedDate] || []) : [];

  const formatTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hour = parseInt(h, 10);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-gray-200 transition">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h3 className="text-lg font-semibold text-gray-100 min-w-[180px] text-center">{monthLabel}</h3>
          <button onClick={nextMonth} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-gray-200 transition">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <button
          onClick={goToday}
          className="px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-900 border border-gray-700 rounded-lg hover:bg-gray-700 hover:text-gray-200 transition"
        >
          Today
        </button>
      </div>

      {loading && (
        <p className="text-center text-gray-500 py-8">Loading calendar…</p>
      )}

      {!loading && (
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Calendar Grid */}
          <div className="flex-1">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">
                  {d}
                </div>
              ))}
            </div>

            {/* Date cells */}
            <div className="grid grid-cols-7 gap-px bg-gray-700 rounded-lg overflow-hidden">
              {cells.map((day, i) => {
                if (day === null) {
                  return <div key={`blank-${i}`} className="bg-gray-800/50 min-h-[80px]" />;
                }
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayAppts = byDate[dateStr] || [];
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={`bg-gray-800 min-h-[80px] p-1.5 text-left transition hover:bg-gray-700/50 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isSelected ? 'ring-2 ring-blue-500 bg-gray-700/60' : ''
                    }`}
                  >
                    <span
                      className={`inline-flex items-center justify-center text-xs font-medium w-6 h-6 rounded-full ${
                        isToday
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300'
                      }`}
                    >
                      {day}
                    </span>

                    {/* Appointment dots */}
                    {dayAppts.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {dayAppts.slice(0, 3).map((a) => (
                          <div key={a.id} className="flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[a.status] || 'bg-gray-400'}`} />
                            <span className="text-[10px] text-gray-400 truncate leading-tight">
                              {formatTime(a.appointment_time)}
                            </span>
                          </div>
                        ))}
                        {dayAppts.length > 3 && (
                          <span className="text-[10px] text-gray-500">+{dayAppts.length - 3} more</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 text-[11px] text-gray-500">
              {Object.entries(STATUS_DOT).map(([label, color]) => (
                <span key={label} className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${color}`} /> {label}
                </span>
              ))}
            </div>
          </div>

          {/* Day Detail Panel */}
          {selectedDate && (
            <div className="lg:w-80 shrink-0">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-200 mb-3">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', {
                    weekday: 'long', month: 'long', day: 'numeric',
                  })}
                </h4>

                {selectedAppts.length === 0 && (
                  <p className="text-xs text-gray-500 py-4 text-center">No appointments this day.</p>
                )}

                <div className="space-y-2">
                  {selectedAppts.map((a) => (
                    <div
                      key={a.id}
                      className="bg-gray-900 rounded-lg p-3 border border-gray-700"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-100 flex items-center gap-1.5">
                          <User className="h-3 w-3 text-blue-400" />
                          {a.patient_first_name} {a.patient_last_name}
                        </span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_BADGE[a.status] || 'bg-gray-700 text-gray-300'}`}>
                          {a.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatTime(a.appointment_time)}
                      </p>
                      {a.reason_for_visit && (
                        <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{a.reason_for_visit}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
