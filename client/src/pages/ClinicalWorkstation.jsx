import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Users, Stethoscope, Activity, Heart, Thermometer, Wind, Scale,
  FileText, Pill, Plus, ChevronRight, ChevronLeft, Hash, Shield,
  ClipboardList, AlertTriangle, Calendar, Zap, CheckCircle2,
  Search, X, ChevronDown,
} from 'lucide-react';
import { API_URL } from '../constants/api';
import { initialSoapForm, TEMPLATES } from '../utils/soap';
import { generateHash } from '../utils/hashPreview';
import RecordsList from '../components/records/RecordsList';
import PatientSearch from '../components/ui/PatientSearch';

const inputClass =
  'mt-1 block w-full sm:text-sm rounded-lg p-2.5 bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500';

const TABS = [
  { id: 'patient', label: 'Patient', icon: Users },
  { id: 'vitals', label: 'Vitals', icon: Activity },
  { id: 'diagnosis', label: 'Diagnosis', icon: Stethoscope },
  { id: 'prescription', label: 'Prescription', icon: Pill },
];

const SEVERITY_OPTIONS = [
  { value: 'mild', label: 'Mild', color: 'text-green-700 bg-green-50 border-green-300' },
  { value: 'moderate', label: 'Moderate', color: 'text-yellow-700 bg-yellow-50 border-yellow-300' },
  { value: 'severe', label: 'Severe', color: 'text-orange-700 bg-orange-50 border-orange-300' },
  { value: 'critical', label: 'Critical', color: 'text-red-700 bg-red-50 border-red-300' },
];

// ====================================
// Searchable Patient Combobox — now imported from components/ui/PatientSearch
// ====================================

export default function ClinicalWorkstation({ token }) {
  const [activeTab, setActiveTab] = useState('patient');
  const [soapForm, setSoapForm] = useState(initialSoapForm);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patients, setPatients] = useState([]);
  const [records, setRecords] = useState([]);
  const [verificationStatus, setVerificationStatus] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // ---- Fetch patients on mount ----
  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const res = await axios.get(`${API_URL}/patients?limit=100`, {
          ...authHeaders,
          signal: controller.signal,
        });
        const list = res.data.data || res.data;
        setPatients(list);
        if (list.length) setSelectedPatientId(list[0].id);
      } catch (err) {
        if (!axios.isCancel(err)) {
          console.error('Error fetching patients', err);
        }
      }
    })();

    return () => controller.abort();
  }, [token]);

  // ---- Fetch records when patient changes ----
  useEffect(() => {
    if (!selectedPatientId) return;

    const controller = new AbortController();

    (async () => {
      try {
        const res = await axios.get(`${API_URL}/records?patientId=${selectedPatientId}`, {
          ...authHeaders,
          signal: controller.signal,
        });
        setRecords(res.data);
      } catch (err) {
        if (!axios.isCancel(err)) {
          console.error('Error fetching records', err);
        }
      }
    })();

    return () => controller.abort();
  }, [selectedPatientId, token]);

  // ---- Live hash preview ----
  const liveHash = useMemo(() => {
    const str = [
      `S: ${(soapForm.subjective || '').trim()}`,
      `O: BP ${(soapForm.vitals.bp || '').trim()} HR ${(soapForm.vitals.hr || '').toString().trim()} Temp ${(soapForm.vitals.temp || '').toString().trim()}`,
      `A: ${(soapForm.assessment || '').trim()}`,
      `P: ${(soapForm.plan || '').trim()}`,
    ].join('\n');
    return generateHash(str);
  }, [soapForm]);

  // ---- Helpers ----
  const setField = (key, value) => setSoapForm((prev) => ({ ...prev, [key]: value }));
  const setVital = (key, value) =>
    setSoapForm((prev) => ({ ...prev, vitals: { ...prev.vitals, [key]: value } }));

  const currentTabIdx = TABS.findIndex((t) => t.id === activeTab);
  const canPrev = currentTabIdx > 0;
  const canNext = currentTabIdx < TABS.length - 1;
  const isLastTab = currentTabIdx === TABS.length - 1;

  const goNext = () => canNext && setActiveTab(TABS[currentTabIdx + 1].id);
  const goPrev = () => canPrev && setActiveTab(TABS[currentTabIdx - 1].id);

  // ---- Template application ----
  const applyTemplate = (tmpl) => {
    setSoapForm(tmpl.data);
    setActiveTab('vitals');
    toast.success(`Template "${tmpl.name}" applied`);
  };

  // ---- Submit ----
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!soapForm.assessment.trim()) {
      toast.error('Assessment (Diagnosis) is required.');
      setActiveTab('diagnosis');
      return;
    }
    if (!selectedPatientId) {
      toast.error('Please select a patient.');
      setActiveTab('patient');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(
        `${API_URL}/records`,
        {
          patient_id: selectedPatientId,
          subjective: soapForm.subjective,
          vitals: soapForm.vitals,
          assessment: soapForm.assessment,
          plan: soapForm.plan,
          severity: soapForm.severity,
          allergies: soapForm.allergies,
          followUp: soapForm.followUp,
        },
        authHeaders
      );
      setSoapForm(initialSoapForm);
      setActiveTab('patient');

      // Refresh records
      const res = await axios.get(`${API_URL}/records?patientId=${selectedPatientId}`, authHeaders);
      setRecords(res.data);

      toast.success('Record saved to Blockchain!');
    } catch (err) {
      toast.error('Failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Verify ----
  const verifyRecord = async (id) => {
    setVerificationStatus((prev) => ({ ...prev, [id]: 'loading' }));
    try {
      const res = await axios.get(`${API_URL}/verify/${id}`, authHeaders);
      if (res.data.status === 'SECURE') {
        setVerificationStatus((prev) => ({ ...prev, [id]: 'secure' }));
        toast.success('Record integrity verified!');
      } else {
        setVerificationStatus((prev) => ({ ...prev, [id]: 'tampered' }));
        toast.error('Record has been TAMPERED!');
      }
    } catch (err) {
      setVerificationStatus((prev) => ({ ...prev, [id]: 'error' }));
      toast.error('Verification failed');
    }
  };

  // ---- Selected patient info ----
  const selectedPatient = patients.find((p) => p.id === Number(selectedPatientId));

  // ====================================
  // Tab content renderers
  // ====================================
  const renderPatientTab = () => (
    <div className="space-y-5">
      {/* Searchable Patient Combobox */}
      <PatientSearch
        patients={patients}
        selectedPatientId={selectedPatientId}
        onSelect={(id) => setSelectedPatientId(id)}
        theme="light"
      />


      {/* Subjective */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          <FileText className="h-4 w-4 inline mr-1" />
          Subjective (Chief Complaint / Symptoms)
        </label>
        <textarea
          className={inputClass}
          rows={3}
          placeholder="Patient complaints, history of present illness..."
          value={soapForm.subjective}
          onChange={(e) => setField('subjective', e.target.value)}
        />
      </div>

      {/* Quick Templates */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
          <Zap className="h-4 w-4 text-amber-600" /> Quick Templates
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.name}
              type="button"
              onClick={() => applyTemplate(tmpl)}
              className="text-left px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 transition text-sm text-gray-700"
            >
              <span className="font-medium text-gray-900">{tmpl.name}</span>
              <p className="text-xs text-gray-600 mt-0.5 truncate">{tmpl.data.assessment}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderVitalsTab = () => (
    <div className="space-y-5">
      <p className="text-sm text-gray-600">Record the patient's objective measurements.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <label className="text-xs font-medium text-blue-700 flex items-center gap-1 mb-2">
            <Activity className="h-3.5 w-3.5" /> Blood Pressure
          </label>
          <input type="text" className={inputClass} placeholder="120/80" value={soapForm.vitals.bp} onChange={(e) => setVital('bp', e.target.value)} />
        </div>
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
          <label className="text-xs font-medium text-rose-700 flex items-center gap-1 mb-2">
            <Heart className="h-3.5 w-3.5" /> Heart Rate (bpm)
          </label>
          <input type="number" className={inputClass} placeholder="72" value={soapForm.vitals.hr} onChange={(e) => setVital('hr', e.target.value)} />
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <label className="text-xs font-medium text-amber-700 flex items-center gap-1 mb-2">
            <Thermometer className="h-3.5 w-3.5" /> Temperature (&deg;F)
          </label>
          <input type="number" step="0.1" className={inputClass} placeholder="98.6" value={soapForm.vitals.temp} onChange={(e) => setVital('temp', e.target.value)} />
        </div>
        <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4">
          <label className="text-xs font-medium text-cyan-700 flex items-center gap-1 mb-2">
            <Wind className="h-3.5 w-3.5" /> SpO2 (%)
          </label>
          <input type="number" className={inputClass} placeholder="98" value={soapForm.vitals.spo2} onChange={(e) => setVital('spo2', e.target.value)} />
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <label className="text-xs font-medium text-purple-700 flex items-center gap-1 mb-2">
            <Scale className="h-3.5 w-3.5" /> Weight (lbs)
          </label>
          <input type="number" step="0.1" className={inputClass} placeholder="165" value={soapForm.vitals.weight} onChange={(e) => setVital('weight', e.target.value)} />
        </div>
      </div>
    </div>
  );

  const renderDiagnosisTab = () => (
    <div className="space-y-5">
      {/* Assessment */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          <Stethoscope className="h-4 w-4 inline mr-1" />
          Assessment (Diagnosis) *
        </label>
        <input
          type="text"
          required
          className={inputClass}
          placeholder="Primary diagnosis..."
          value={soapForm.assessment}
          onChange={(e) => setField('assessment', e.target.value)}
        />
      </div>

      {/* Severity */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <AlertTriangle className="h-4 w-4 inline mr-1" />
          Severity
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SEVERITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setField('severity', opt.value)}
              className={`px-3 py-2 rounded-lg border text-sm font-medium transition ${
                soapForm.severity === opt.value
                  ? opt.color + ' ring-1 ring-current'
                    : 'text-gray-700 border-gray-300 bg-white hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Allergies */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          <ClipboardList className="h-4 w-4 inline mr-1" />
          Known Allergies
        </label>
        <input
          type="text"
          className={inputClass}
          placeholder="e.g., Penicillin, Sulfa drugs, Latex..."
          value={soapForm.allergies}
          onChange={(e) => setField('allergies', e.target.value)}
        />
      </div>
    </div>
  );

  const renderPrescriptionTab = () => (
    <div className="space-y-5">
      {/* Plan */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          <Pill className="h-4 w-4 inline mr-1" />
          Plan (Treatment / Prescription)
        </label>
        <textarea
          className={inputClass}
          rows={4}
          placeholder="Medications, dosages, treatment instructions..."
          value={soapForm.plan}
          onChange={(e) => setField('plan', e.target.value)}
        />
      </div>

      {/* Follow-up */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          <Calendar className="h-4 w-4 inline mr-1" />
          Follow-up
        </label>
        <input
          type="text"
          className={inputClass}
          placeholder="e.g., 2 weeks, 1 month, As needed..."
          value={soapForm.followUp}
          onChange={(e) => setField('followUp', e.target.value)}
        />
      </div>

      {/* Live Hash Preview */}
      <div className="bg-gray-50 border border-gray-300 rounded-xl p-4">
        <p className="text-xs font-semibold uppercase text-gray-600 flex items-center gap-1 mb-2">
          <Hash className="h-3.5 w-3.5" /> Live Blockchain Hash Preview
        </p>
        <p className="text-xs font-mono text-emerald-700 break-all leading-relaxed">{liveHash}</p>
        <p className="text-[10px] text-gray-500 mt-2">SHA-256 computed from SOAP fields &bull; Updates in real-time</p>
      </div>
    </div>
  );

  const TAB_RENDERERS = {
    patient: renderPatientTab,
    vitals: renderVitalsTab,
    diagnosis: renderDiagnosisTab,
    prescription: renderPrescriptionTab,
  };

  // ====================================
  // Completion indicators per tab
  // ====================================
  const tabComplete = {
    patient: !!selectedPatientId && !!soapForm.subjective.trim(),
    vitals: !!soapForm.vitals.bp || !!soapForm.vitals.hr || !!soapForm.vitals.temp,
    diagnosis: !!soapForm.assessment.trim(),
    prescription: !!soapForm.plan.trim(),
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 lg:p-6">
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* ====== LEFT: Form (3 cols) ====== */}
        <div className="xl:col-span-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Stethoscope className="h-6 w-6 text-blue-500" />
              Clinical Workstation
            </h2>
            <p className="text-sm text-gray-600 mt-0.5">Create blockchain-secured SOAP notes</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="h-4 w-4 text-emerald-500" />
            <span className="text-xs text-emerald-700 font-medium">SHA-256 Secured</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Tab bar */}
          <div className="flex border-b border-gray-300 mb-0">
            {TABS.map((tab, idx) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const done = tabComplete[tab.id];
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition border-b-2 -mb-px ${
                    isActive
                      ? 'border-blue-500 text-blue-400'
                        : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-400'
                  }`}
                >
                  {done && !isActive ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{idx + 1}</span>
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="bg-white border border-gray-300 border-t-0 rounded-b-xl p-5 min-h-80">
            {TAB_RENDERERS[activeTab]()}
          </div>

          {/* Navigation + Submit */}
          <div className="flex items-center justify-between mt-4">
            <button
              type="button"
              onClick={goPrev}
              disabled={!canPrev}
              className={`inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
                canPrev
                    ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>

            <div className="flex items-center gap-3">
              {/* Step indicator */}
              <span className="text-xs text-gray-600">
                Step {currentTabIdx + 1} of {TABS.length}
              </span>

              {isLastTab ? (
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm transition"
                >
                  <Plus className="h-4 w-4" />
                  {submitting ? 'Saving...' : 'Save to Chain'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={goNext}
                  className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </form>
        </div>

        {/* ====== RIGHT: Records in scrollable container (2 cols) ====== */}
        <div className="xl:col-span-2">
          <div className="sticky top-8">
            <div className="bg-white border border-gray-300 rounded-xl overflow-hidden">
            {/* Container header */}
            <div className="px-4 py-3 border-b border-gray-300 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">Medical History</h3>
              <p className="text-xs text-gray-600">
                {selectedPatient
                  ? `${selectedPatient.first_name} ${selectedPatient.last_name} — ${records.length} record${records.length !== 1 ? 's' : ''}`
                  : 'Select a patient'}
              </p>
            </div>

              {/* Scrollable records area */}
              <div className="overflow-y-auto max-h-[calc(100vh-12rem)] p-4">
                <RecordsList
                  records={records}
                  verificationStatus={verificationStatus}
                  onVerifyRecord={verifyRecord}
                  theme="light"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
