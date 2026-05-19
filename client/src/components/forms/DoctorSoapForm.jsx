import { Activity, Plus, Stethoscope, Thermometer, Heart, Users } from 'lucide-react';

const inputClass =
  'mt-1 block w-full sm:text-sm rounded-lg p-2.5 bg-gray-900 border border-gray-700 text-gray-100 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500';

function DoctorSoapForm({ soapForm, setSoapForm, onSubmit, patients, selectedPatientId, onPatientChange }) {
  const setVital = (key, value) =>
    setSoapForm((prev) => ({ ...prev, vitals: { ...prev.vitals, [key]: value } }));

  return (
    <div className="bg-gray-800 overflow-hidden rounded-xl mb-6 border-l-4 border-blue-600 border-y border-r border-y-gray-700 border-r-gray-700">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-100 flex items-center">
          <Stethoscope className="h-5 w-5 mr-2 text-blue-500" />
          Doctor&rsquo;s Console: Add Medical Record
        </h3>

        <form onSubmit={onSubmit} className="mt-5 space-y-5">
          {/* ---- Patient Selection ---- */}
          <div>
            <label className="text-sm font-medium text-gray-400 flex items-center gap-1">
              <Users className="h-4 w-4" /> Select Patient *
            </label>
            <select
              required
              value={selectedPatientId}
              onChange={onPatientChange}
              className={inputClass}
            >
              <option value="" disabled>-- Choose a patient --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name} (ID: {p.id})
                </option>
              ))}
            </select>
          </div>

          {/* ---- Subjective ---- */}
          <div>
            <label className="block text-sm font-medium text-gray-400">Subjective (Symptoms)</label>
            <textarea
              className={inputClass}
              rows={2}
              placeholder="Patient complaints..."
              value={soapForm.subjective}
              onChange={(e) => setSoapForm((prev) => ({ ...prev, subjective: e.target.value }))}
            />
          </div>

          {/* ---- Objective / Vitals ---- */}
          <fieldset className="border border-gray-700 rounded-xl p-4 space-y-3">
            <legend className="text-sm font-medium text-gray-400 px-1">Objective &mdash; Vitals</legend>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                  <Activity className="h-3.5 w-3.5" /> Blood Pressure
                </label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="120/80"
                  value={soapForm.vitals.bp}
                  onChange={(e) => setVital('bp', e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5" /> Heart Rate (bpm)
                </label>
                <input
                  type="number"
                  className={inputClass}
                  placeholder="72"
                  value={soapForm.vitals.hr}
                  onChange={(e) => setVital('hr', e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                  <Thermometer className="h-3.5 w-3.5" /> Temperature (&deg;F)
                </label>
                <input
                  type="number"
                  step="0.1"
                  className={inputClass}
                  placeholder="98.6"
                  value={soapForm.vitals.temp}
                  onChange={(e) => setVital('temp', e.target.value)}
                />
              </div>
            </div>
          </fieldset>

          {/* ---- Assessment ---- */}
          <div>
            <label className="block text-sm font-medium text-gray-400">Assessment (Diagnosis) *</label>
            <input
              type="text"
              required
              className={inputClass}
              placeholder="Diagnosis..."
              value={soapForm.assessment}
              onChange={(e) => setSoapForm((prev) => ({ ...prev, assessment: e.target.value }))}
            />
          </div>

          {/* ---- Plan ---- */}
          <div>
            <label className="block text-sm font-medium text-gray-400">Plan (Treatment / Prescription)</label>
            <textarea
              className={inputClass}
              rows={2}
              placeholder="Treatment plan..."
              value={soapForm.plan}
              onChange={(e) => setSoapForm((prev) => ({ ...prev, plan: e.target.value }))}
            />
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center px-4 py-2.5 border border-transparent font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition sm:w-auto sm:text-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Save to Chain
          </button>
        </form>
      </div>
    </div>
  );
}

export default DoctorSoapForm;
