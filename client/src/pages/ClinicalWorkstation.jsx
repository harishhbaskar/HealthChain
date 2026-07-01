import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Users, Stethoscope, Activity, Heart, Thermometer, Wind, Scale,
  FileText, Pill, Plus, ChevronRight, ChevronLeft, Hash, Shield,
  ClipboardList, AlertTriangle, Calendar, Zap, CheckCircle2,
} from 'lucide-react';
import { API_URL } from '../constants/api';
import { initialSoapForm, TEMPLATES } from '../utils/soap';
import { generateHash } from '../utils/hashPreview';
import RecordsList from '../components/records/RecordsList';
import PatientSearch from '../components/ui/PatientSearch';

/* shared dark input style */
const inputClass =
  'input-premium mt-1 block w-full rounded-xl px-3 py-2.5 text-sm';

const TABS = [
  { id: 'patient',      label: 'Patient',      icon: Users       },
  { id: 'vitals',       label: 'Vitals',       icon: Activity    },
  { id: 'diagnosis',    label: 'Diagnosis',    icon: Stethoscope },
  { id: 'prescription', label: 'Prescription', icon: Pill        },
];

const SEVERITY = [
  { value: 'mild',     label: 'Mild',     ring: 'border-emerald-500/60 text-emerald-400 bg-emerald-500/10' },
  { value: 'moderate', label: 'Moderate', ring: 'border-yellow-500/60  text-yellow-400  bg-yellow-500/10'  },
  { value: 'severe',   label: 'Severe',   ring: 'border-orange-500/60  text-orange-400  bg-orange-500/10'  },
  { value: 'critical', label: 'Critical', ring: 'border-red-500/60     text-red-400     bg-red-500/10'     },
];

const VITALS_FIELDS = [
  { key: 'bp',     label: 'Blood Pressure', unit: 'mmHg', placeholder: '120/80', icon: Activity,    color: 'blue'   },
  { key: 'hr',     label: 'Heart Rate',     unit: 'bpm',  placeholder: '72',     icon: Heart,       color: 'rose'   },
  { key: 'temp',   label: 'Temperature',    unit: '°F',   placeholder: '98.6',   icon: Thermometer, color: 'amber'  },
  { key: 'spo2',   label: 'SpO₂',           unit: '%',    placeholder: '98',     icon: Wind,        color: 'cyan'   },
  { key: 'weight', label: 'Weight',         unit: 'lbs',  placeholder: '165',    icon: Scale,       color: 'violet' },
];

const VITAL_COLORS = {
  blue:   'border-blue-500/30   bg-blue-500/8   text-blue-300',
  rose:   'border-rose-500/30   bg-rose-500/8   text-rose-300',
  amber:  'border-amber-500/30  bg-amber-500/8  text-amber-300',
  cyan:   'border-cyan-500/30   bg-cyan-500/8   text-cyan-300',
  violet: 'border-violet-500/30 bg-violet-500/8 text-violet-300',
};

export default function ClinicalWorkstation({ token }) {
  const [activeTab, setActiveTab]           = useState('patient');
  const [soapForm, setSoapForm]             = useState(initialSoapForm);
  const [selectedPatientId, setSelected]    = useState('');
  const [patients, setPatients]             = useState([]);
  const [records, setRecords]               = useState([]);
  const [verificationStatus, setVerStatus]  = useState({});
  const [submitting, setSubmitting]         = useState(false);

  const auth = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    const ctrl = new AbortController();
    axios.get(`${API_URL}/patients?limit=100`, { ...auth, signal: ctrl.signal })
      .then((r) => {
        const list = r.data.data || r.data;
        setPatients(list);
        if (list.length) setSelected(list[0].id);
      })
      .catch((e) => { if (!axios.isCancel(e)) console.error(e); });
    return () => ctrl.abort();
  }, [token]);

  useEffect(() => {
    if (!selectedPatientId) return;
    const ctrl = new AbortController();
    axios.get(`${API_URL}/records?patientId=${selectedPatientId}`, { ...auth, signal: ctrl.signal })
      .then((r) => setRecords(r.data))
      .catch((e) => { if (!axios.isCancel(e)) console.error(e); });
    return () => ctrl.abort();
  }, [selectedPatientId, token]);

  const liveHash = useMemo(() => {
    const str = [
      `S: ${(soapForm.subjective || '').trim()}`,
      `O: BP ${soapForm.vitals.bp || ''} HR ${soapForm.vitals.hr || ''} Temp ${soapForm.vitals.temp || ''}`,
      `A: ${(soapForm.assessment || '').trim()}`,
      `P: ${(soapForm.plan || '').trim()}`,
    ].join('\n');
    return generateHash(str);
  }, [soapForm]);

  const setField = (k, v) => setSoapForm((p) => ({ ...p, [k]: v }));
  const setVital = (k, v) => setSoapForm((p) => ({ ...p, vitals: { ...p.vitals, [k]: v } }));

  const tabIdx   = TABS.findIndex((t) => t.id === activeTab);
  const canPrev  = tabIdx > 0;
  const canNext  = tabIdx < TABS.length - 1;
  const isLast   = tabIdx === TABS.length - 1;

  const applyTemplate = (tmpl) => {
    setSoapForm(tmpl.data);
    setActiveTab('vitals');
    toast.success(`"${tmpl.name}" applied`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!soapForm.assessment.trim()) { toast.error('Assessment is required.'); setActiveTab('diagnosis'); return; }
    if (!selectedPatientId)          { toast.error('Select a patient.');        setActiveTab('patient');   return; }
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/records`, {
        patient_id: selectedPatientId,
        subjective: soapForm.subjective,
        vitals:     soapForm.vitals,
        assessment: soapForm.assessment,
        plan:       soapForm.plan,
        severity:   soapForm.severity,
        allergies:  soapForm.allergies,
        followUp:   soapForm.followUp,
      }, auth);
      setSoapForm(initialSoapForm);
      setActiveTab('patient');
      const r = await axios.get(`${API_URL}/records?patientId=${selectedPatientId}`, auth);
      setRecords(r.data);
      toast.success('Record saved to Blockchain!');
    } catch (err) {
      toast.error('Failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const verifyRecord = async (id) => {
    setVerStatus((p) => ({ ...p, [id]: 'loading' }));
    try {
      const r = await axios.get(`${API_URL}/verify/${id}`, auth);
      if (r.data.status === 'SECURE') {
        setVerStatus((p) => ({ ...p, [id]: 'secure' }));
        toast.success('Record integrity verified!');
      } else {
        setVerStatus((p) => ({ ...p, [id]: 'tampered' }));
        toast.error('Record has been TAMPERED!');
      }
    } catch {
      setVerStatus((p) => ({ ...p, [id]: 'error' }));
      toast.error('Verification failed');
    }
  };

  const selectedPatient = patients.find((p) => p.id === Number(selectedPatientId));

  const tabComplete = {
    patient:      !!selectedPatientId && !!soapForm.subjective.trim(),
    vitals:       !!(soapForm.vitals.bp || soapForm.vitals.hr || soapForm.vitals.temp),
    diagnosis:    !!soapForm.assessment.trim(),
    prescription: !!soapForm.plan.trim(),
  };

  /* ── Tab renderers ── */
  const renderPatient = () => (
    <div className="space-y-5">
      <PatientSearch
        patients={patients}
        selectedPatientId={selectedPatientId}
        onSelect={setSelected}
        theme="dark"
      />

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          <FileText className="h-3.5 w-3.5 inline mr-1.5" />
          Subjective — Chief Complaint / Symptoms
        </label>
        <textarea
          className={inputClass}
          rows={4}
          placeholder="Patient complaints, history of present illness..."
          value={soapForm.subjective}
          onChange={(e) => setField('subjective', e.target.value)}
        />
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-amber-400" />
          Quick Templates
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.name}
              type="button"
              onClick={() => applyTemplate(tmpl)}
              className="text-left px-3 py-2.5 rounded-xl border border-white/8
                         bg-white/4 hover:bg-white/8 hover:border-blue-500/30
                         transition-all text-sm"
            >
              <span className="font-medium text-slate-200">{tmpl.name}</span>
              <p className="text-xs text-slate-500 mt-0.5 truncate">{tmpl.data.assessment}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderVitals = () => (
    <div className="space-y-5">
      <p className="text-xs text-slate-500">Record the patient&apos;s objective measurements.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {VITALS_FIELDS.map(({ key, label, unit, placeholder, icon: Icon, color }) => (
          <div key={key}
               className={`rounded-xl border p-4 ${VITAL_COLORS[color]}`}>
            <label className="text-xs font-semibold flex items-center gap-1.5 mb-2 uppercase tracking-wider">
              <Icon className="h-3.5 w-3.5" /> {label}
              <span className="font-normal opacity-60">({unit})</span>
            </label>
            <input
              type={key === 'bp' ? 'text' : 'number'}
              step={key === 'temp' || key === 'weight' ? '0.1' : undefined}
              className={inputClass}
              placeholder={placeholder}
              value={soapForm.vitals[key]}
              onChange={(e) => setVital(key, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );

  const renderDiagnosis = () => (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          <Stethoscope className="h-3.5 w-3.5 inline mr-1.5" />
          Assessment — Diagnosis *
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

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          <AlertTriangle className="h-3.5 w-3.5 inline mr-1.5" />
          Severity
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SEVERITY.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setField('severity', opt.value)}
              className={`px-3 py-2 rounded-xl border text-sm font-medium transition-all
                ${soapForm.severity === opt.value
                  ? opt.ring
                  : 'border-white/8 text-slate-400 bg-white/4 hover:bg-white/8'
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          <ClipboardList className="h-3.5 w-3.5 inline mr-1.5" />
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

  const renderPrescription = () => (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          <Pill className="h-3.5 w-3.5 inline mr-1.5" />
          Plan — Treatment / Prescription
        </label>
        <textarea
          className={inputClass}
          rows={5}
          placeholder="Medications, dosages, treatment instructions..."
          value={soapForm.plan}
          onChange={(e) => setField('plan', e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          <Calendar className="h-3.5 w-3.5 inline mr-1.5" />
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

      {/* Live hash preview */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400
                      flex items-center gap-1.5 mb-2">
          <Hash className="h-3.5 w-3.5" />
          Live Blockchain Hash Preview
        </p>
        <p className="text-xs font-mono text-emerald-300 break-all leading-relaxed">{liveHash}</p>
        <p className="text-[10px] text-slate-600 mt-2">
          SHA-256 computed from SOAP fields · Updates in real-time
        </p>
      </div>
    </div>
  );

  const TAB_RENDERERS = {
    patient: renderPatient, vitals: renderVitals,
    diagnosis: renderDiagnosis, prescription: renderPrescription,
  };

  return (
    <div className="glass-card rounded-2xl p-5 lg:p-6">
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

        {/* ── LEFT: SOAP form ── */}
        <div className="xl:col-span-3">

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center
                                justify-center border border-blue-500/25">
                  <Stethoscope className="h-4.5 w-4.5 text-blue-400" />
                </div>
                Clinical Workstation
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Create blockchain-secured SOAP notes
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                            bg-emerald-500/10 border border-emerald-500/20">
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs text-emerald-400 font-medium">SHA-256 Secured</span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Tab bar */}
            <div className="flex border-b border-white/8 mb-0">
              {TABS.map((tab, idx) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                const done   = tabComplete[tab.id];
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium
                                transition-all border-b-2 -mb-px
                      ${active
                        ? 'border-blue-500 text-blue-400'
                        : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-600'
                      }`}
                  >
                    {done && !active
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      : <Icon className="h-4 w-4" />
                    }
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{idx + 1}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            <div className="border border-white/8 border-t-0 rounded-b-xl p-5 min-h-80
                            bg-white/2">
              {TAB_RENDERERS[activeTab]()}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-4">
              <button
                type="button"
                onClick={() => canPrev && setActiveTab(TABS[tabIdx - 1].id)}
                disabled={!canPrev}
                className={`inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm
                            font-medium transition-all
                  ${canPrev
                    ? 'bg-white/8 text-slate-300 hover:bg-white/12 border border-white/10'
                    : 'bg-white/4 text-slate-600 cursor-not-allowed border border-white/5'
                  }`}
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>

              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  {TABS.map((t, i) => (
                    <div key={t.id}
                         className={`h-1.5 rounded-full transition-all ${
                           i === tabIdx
                             ? 'w-6 bg-blue-500'
                             : tabComplete[t.id]
                             ? 'w-1.5 bg-emerald-500'
                             : 'w-1.5 bg-white/15'
                         }`} />
                  ))}
                </div>
                <span className="text-xs text-slate-600">
                  {tabIdx + 1} / {TABS.length}
                </span>

                {isLast ? (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary inline-flex items-center gap-1.5 px-5 py-2.5
                               text-white font-semibold rounded-xl text-sm cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    {submitting ? 'Saving…' : 'Save to Chain'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveTab(TABS[tabIdx + 1].id)}
                    className="btn-primary inline-flex items-center gap-1 px-4 py-2
                               text-white font-medium rounded-xl text-sm cursor-pointer"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* ── RIGHT: Medical history ── */}
        <div className="xl:col-span-2">
          <div className="sticky top-8">
            <div className="rounded-xl border border-white/8 overflow-hidden bg-white/2">
              <div className="px-4 py-3 border-b border-white/8 bg-white/3">
                <h3 className="text-sm font-semibold text-slate-200">Medical History</h3>
                <p className="text-xs text-slate-500">
                  {selectedPatient
                    ? `${selectedPatient.first_name} ${selectedPatient.last_name} · ${records.length} record${records.length !== 1 ? 's' : ''}`
                    : 'Select a patient'}
                </p>
              </div>
              <div className="overflow-y-auto max-h-[calc(100vh-12rem)] p-3">
                <RecordsList
                  records={records}
                  verificationStatus={verificationStatus}
                  onVerifyRecord={verifyRecord}
                  theme="dark"
                />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
