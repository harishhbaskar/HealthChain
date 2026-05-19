import { useState, useEffect, useMemo, useRef } from 'react';
import { Users, Search, X, ChevronDown } from 'lucide-react';

/**
 * Searchable Patient Combobox — shared between ClinicalWorkstation & Scheduler.
 *
 * Props:
 *  - patients          Array of patient objects
 *  - selectedPatientId Currently selected patient id (string or number)
 *  - onSelect          Callback receiving the selected patient id
 *  - compact           (optional) smaller variant for modals
 */
export default function PatientSearch({ patients, selectedPatientId, onSelect, compact = false, theme = 'dark' }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const isLight = theme === 'light';

  const selectedPatient = patients.find((p) => p.id === Number(selectedPatientId));

  const filtered = useMemo(() => {
    if (!query.trim()) return patients;
    const q = query.toLowerCase();
    return patients.filter(
      (p) =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
        String(p.id).includes(q) ||
        (p.phone_number || '').includes(q)
    );
  }, [query, patients]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pick = (p) => {
    onSelect(p.id);
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label className={`text-sm font-medium flex items-center gap-1 mb-1 ${isLight ? 'text-gray-700' : 'text-gray-400'}`}>
        <Users className="h-4 w-4" /> Patient *
      </label>

      {/* Selected badge OR search input */}
      {selectedPatient && !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`w-full flex items-center gap-3 rounded-lg transition text-left ${
            isLight
              ? 'bg-white border border-gray-300 hover:border-gray-400'
              : 'bg-gray-900 border border-gray-700 hover:border-gray-500'
          } ${
            compact ? 'p-2' : 'p-2.5'
          }`}
        >
          <div className={`rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold text-xs shrink-0 ${
            compact ? 'h-8 w-8' : 'h-9 w-9'
          }`}>
            {selectedPatient.first_name?.[0]}{selectedPatient.last_name?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-medium truncate ${isLight ? 'text-gray-900' : 'text-gray-100'} ${compact ? 'text-xs' : 'text-sm'}`}>
              {selectedPatient.first_name} {selectedPatient.last_name}
            </p>
            <p className={`text-xs truncate ${isLight ? 'text-gray-600' : 'text-gray-500'}`}>
              ID: {selectedPatient.id}
              {selectedPatient.gender ? ` • ${selectedPatient.gender.charAt(0).toUpperCase() + selectedPatient.gender.slice(1)}` : ''}
              {selectedPatient.blood_type ? ` • ${selectedPatient.blood_type}` : ''}
            </p>
          </div>
          <ChevronDown className={`h-4 w-4 shrink-0 ${isLight ? 'text-gray-600' : 'text-gray-500'}`} />
        </button>
      ) : (
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isLight ? 'text-gray-400' : 'text-gray-500'}`} />
          <input
            type="text"
            autoFocus={open}
            className={`block w-full rounded-lg pl-9 pr-9 focus:ring-blue-500 focus:border-blue-500 focus:outline-none ${
              isLight
                ? 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'
                : 'bg-gray-900 border border-blue-500 text-gray-100 placeholder-gray-500'
            } ${
              compact ? 'text-xs py-2' : 'sm:text-sm py-2.5'
            }`}
            placeholder="Search by name, ID, or phone..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className={`absolute right-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-gray-500 hover:text-gray-700' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Results dropdown */}
      {open && (
        <div className={`absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-xl shadow-2xl ${isLight ? 'bg-white border border-gray-300' : 'bg-gray-800 border border-gray-600'}`}>
          {filtered.length === 0 ? (
            <p className={`px-4 py-3 text-sm ${isLight ? 'text-gray-600' : 'text-gray-500'}`}>No patients found</p>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => pick(p)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${
                  isLight ? 'hover:bg-gray-50' : 'hover:bg-gray-700'
                } ${
                  p.id === Number(selectedPatientId)
                    ? 'bg-blue-600/10 border-l-2 border-blue-500'
                    : 'border-l-2 border-transparent'
                }`}
              >
                <div className={`rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold text-xs shrink-0 ${
                  compact ? 'h-7 w-7' : 'h-8 w-8'
                }`}>
                  {p.first_name?.[0]}{p.last_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${isLight ? 'text-gray-900' : 'text-gray-100'} ${compact ? 'text-xs' : 'text-sm'}`}>{p.first_name} {p.last_name}</p>
                  <p className={`text-xs truncate ${isLight ? 'text-gray-600' : 'text-gray-500'}`}>
                    ID: {p.id}
                    {p.date_of_birth ? ` • DOB: ${(() => {
                      const [year, month, day] = p.date_of_birth.split('T')[0].split('-');
                      const date = new Date(year, month - 1, day);
                      return date.toLocaleDateString('en-IN');
                    })()}` : ''}
                    {p.phone_number ? ` • ${p.phone_number}` : ''}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
