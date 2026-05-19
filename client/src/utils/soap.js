export const initialSoapForm = {
  subjective: '',
  vitals: { bp: '', hr: '', temp: '', spo2: '', weight: '' },
  assessment: '',
  severity: 'moderate',
  allergies: '',
  plan: '',
  followUp: '',
};

export const TEMPLATES = [
  {
    name: 'Common Cold / URI',
    data: {
      subjective: 'Patient presents with runny nose, sore throat, mild cough for 3 days. No fever.',
      vitals: { bp: '120/80', hr: '72', temp: '98.6', spo2: '98', weight: '' },
      assessment: 'Upper Respiratory Infection (Common Cold)',
      severity: 'mild',
      allergies: '',
      plan: 'Rest, fluids, OTC decongestant. Acetaminophen PRN for discomfort. Return if worsening.',
      followUp: '1 week',
    },
  },
  {
    name: 'Hypertension Follow-up',
    data: {
      subjective: 'Follow-up for hypertension management. Patient reports compliance with medication. No headaches or dizziness.',
      vitals: { bp: '140/90', hr: '68', temp: '98.4', spo2: '97', weight: '' },
      assessment: 'Essential Hypertension - Stage 1',
      severity: 'moderate',
      allergies: '',
      plan: 'Continue Lisinopril 10mg daily. Low-sodium diet. 30 min exercise daily.',
      followUp: '3 months',
    },
  },
  {
    name: 'Type 2 Diabetes Check',
    data: {
      subjective: 'Routine diabetes management visit. Patient reports stable glucose readings. No hypoglycemic episodes.',
      vitals: { bp: '130/85', hr: '74', temp: '98.6', spo2: '98', weight: '' },
      assessment: 'Type 2 Diabetes Mellitus - Controlled',
      severity: 'moderate',
      allergies: '',
      plan: 'Continue Metformin 500mg BID. HbA1c lab ordered. Dietary counseling.',
      followUp: '3 months',
    },
  },
  {
    name: 'Acute Back Pain',
    data: {
      subjective: 'Patient complains of lower back pain after lifting heavy object. Pain radiates to left leg. No numbness.',
      vitals: { bp: '135/88', hr: '78', temp: '98.2', spo2: '99', weight: '' },
      assessment: 'Acute Lumbar Strain',
      severity: 'moderate',
      allergies: '',
      plan: 'Ibuprofen 400mg TID with food. Muscle relaxant PRN. Physical therapy referral.',
      followUp: '2 weeks',
    },
  },
  {
    name: 'Annual Physical',
    data: {
      subjective: 'Annual wellness exam. No active complaints. Patient feels well overall.',
      vitals: { bp: '118/76', hr: '66', temp: '98.5', spo2: '99', weight: '' },
      assessment: 'Routine Health Examination - No abnormalities',
      severity: 'mild',
      allergies: '',
      plan: 'CBC, CMP, Lipid panel ordered. Continue current lifestyle. Flu vaccine administered.',
      followUp: '1 year',
    },
  },
];