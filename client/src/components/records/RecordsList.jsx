import { Activity, Heart, Thermometer, FileText, Pill, Stethoscope, Wind, Scale, AlertTriangle, Calendar, ClipboardList } from 'lucide-react';

const severityColor = {
  mild: 'bg-green-500/10 text-green-400 border-green-500/30',
  moderate: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  severe: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/10 text-red-400 border-red-500/30',
};

function RecordsList({ records, verificationStatus, onVerifyRecord, theme = 'dark' }) {
  const isLight = theme === 'light';

  if (!records.length) {
    return (
      <div className={`rounded-xl p-8 text-center border ${isLight ? 'bg-white text-gray-600 border-gray-300' : 'bg-gray-800 text-gray-500 border-gray-700'}`}>
        No medical records found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h3 className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>Medical History</h3>
        <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Immutable Records from MySQL + Blockchain</p>
      </div>

      {records.map((record) => {
        const vid = record.visit_id;
        const status = verificationStatus[vid];

        return (
          <div
            key={vid}
            className={`rounded-xl overflow-hidden border ${isLight ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-700'}`}
          >
            {/* ---- Header ---- */}
            <div className={`flex items-center justify-between px-5 py-3 border-b ${isLight ? 'bg-gray-50 border-gray-300' : 'bg-gray-900 border-gray-700'}`}>
              <span className="text-sm font-medium text-blue-400">Visit #{vid}</span>
              <span className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-500'}`}>
                {record.visit_date
                  ? (() => {
                      const [year, month, day] = record.visit_date.split('T')[0].split('-');
                      const date = new Date(year, month - 1, day);
                      return date.toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      });
                    })()
                  : ''}
              </span>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* ---- Subjective ---- */}
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wide flex items-center gap-1 ${isLight ? 'text-gray-600' : 'text-gray-500'}`}>
                  <FileText className="h-3.5 w-3.5" /> Subjective
                </p>
                <p className={`mt-1 text-sm ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>{record.chief_complaint || 'N/A'}</p>
              </div>

              {/* ---- Vitals ---- */}
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isLight ? 'text-gray-600' : 'text-gray-500'}`}>Objective &mdash; Vitals</p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 text-center">
                    <Activity className="h-4 w-4 mx-auto text-blue-400" />
                    <p className={`mt-1 text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>BP</p>
                    <p className={`text-sm font-semibold ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>{record.blood_pressure || '—'}</p>
                  </div>
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 text-center">
                    <Heart className="h-4 w-4 mx-auto text-rose-400" />
                    <p className={`mt-1 text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>HR</p>
                    <p className={`text-sm font-semibold ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>{record.heart_rate ? `${record.heart_rate} bpm` : '—'}</p>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-center">
                    <Thermometer className="h-4 w-4 mx-auto text-amber-400" />
                    <p className={`mt-1 text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Temp</p>
                    <p className={`text-sm font-semibold ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>{record.temperature ? `${record.temperature} °F` : '—'}</p>
                  </div>
                  <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-3 py-2 text-center">
                    <Wind className="h-4 w-4 mx-auto text-cyan-400" />
                    <p className={`mt-1 text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>SpO2</p>
                    <p className={`text-sm font-semibold ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>{record.spo2 ? `${record.spo2}%` : '—'}</p>
                  </div>
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2 text-center">
                    <Scale className="h-4 w-4 mx-auto text-purple-400" />
                    <p className={`mt-1 text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Weight</p>
                    <p className={`text-sm font-semibold ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>{record.weight ? `${record.weight} lbs` : '—'}</p>
                  </div>
                </div>
              </div>

              {/* ---- Diagnosis + Severity ---- */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className={`text-xs font-semibold uppercase tracking-wide flex items-center gap-1 ${isLight ? 'text-gray-600' : 'text-gray-500'}`}>
                    <Stethoscope className="h-3.5 w-3.5" /> Assessment (Diagnosis)
                  </p>
                  <p className={`mt-1 text-sm font-bold ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>{record.condition_name || 'N/A'}</p>
                </div>
                {record.severity && (
                  <span className={`text-xs font-medium px-2 py-1 rounded-full border ${severityColor[record.severity] || 'text-gray-400'}`}>
                    {record.severity.charAt(0).toUpperCase() + record.severity.slice(1)}
                  </span>
                )}
              </div>

              {/* ---- Allergies ---- */}
              {record.allergies && (
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wide flex items-center gap-1 ${isLight ? 'text-gray-600' : 'text-gray-500'}`}>
                    <ClipboardList className="h-3.5 w-3.5" /> Allergies
                  </p>
                  <p className={`mt-1 text-sm ${isLight ? 'text-red-700' : 'text-red-300'}`}>{record.allergies}</p>
                </div>
              )}

              {/* ---- Plan ---- */}
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wide flex items-center gap-1 ${isLight ? 'text-gray-600' : 'text-gray-500'}`}>
                  <Pill className="h-3.5 w-3.5" /> Plan (Prescription)
                </p>
                <p className={`mt-1 text-sm font-medium ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>{record.medication_name || 'N/A'}</p>
              </div>

              {/* ---- Follow-up ---- */}
              {record.follow_up && (
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wide flex items-center gap-1 ${isLight ? 'text-gray-600' : 'text-gray-500'}`}>
                    <Calendar className="h-3.5 w-3.5" /> Follow-up
                  </p>
                  <p className={`mt-1 text-sm ${isLight ? 'text-blue-700' : 'text-blue-300'}`}>{record.follow_up}</p>
                </div>
              )}

              {/* ---- Hash ---- */}
              <p className={`text-xs font-mono break-all ${isLight ? 'text-gray-500' : 'text-gray-600'}`}>Hash: {record.record_hash}</p>
            </div>

            {/* ---- Footer / Verify ---- */}
            <div className={`px-5 py-3 border-t flex justify-end ${isLight ? 'bg-gray-50 border-gray-300' : 'bg-gray-900 border-gray-700'}`}>
              <button
                onClick={() => onVerifyRecord(vid)}
                className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white transition
                  ${status === 'secure'
                    ? 'bg-emerald-600'
                    : status === 'tampered'
                    ? 'bg-rose-600'
                    : 'bg-blue-600 hover:bg-blue-700'
                  }`}
              >
                {status === 'secure'
                  ? '✅ Verified Secure'
                  : status === 'tampered'
                  ? '❌ TAMPERED!'
                  : 'Verify Integrity'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default RecordsList;
