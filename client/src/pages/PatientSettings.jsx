import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { User, Phone, ShieldAlert, Save } from 'lucide-react';
import { API_URL } from '../constants/api';

const EMPTY = {
  first_name: '', last_name: '', date_of_birth: '', gender: '', blood_type: '',
  phone_number: '', email: '', address: '',
  emergency_contact_name: '', emergency_contact_phone: '', insurance_provider: '',
};

export default function PatientSettings({ token }) {
  const [form, setForm]     = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const p = res.data;
        setForm({
          first_name:              p.first_name              || '',
          last_name:               p.last_name               || '',
          date_of_birth:           p.date_of_birth ? p.date_of_birth.split('T')[0] : '',
          gender:                  p.gender                  || '',
          blood_type:              p.blood_type              || '',
          phone_number:            p.phone_number            || '',
          email:                   p.email                   || '',
          address:                 p.address                 || '',
          emergency_contact_name:  p.emergency_contact_name  || '',
          emergency_contact_phone: p.emergency_contact_phone || '',
          insurance_provider:      p.insurance_provider      || '',
        });
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, [token]);

  const set = field => e => setForm(p => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put(`${API_URL}/profile`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-center text-gray-500 py-20">Loading…</p>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Update your personal and medical information</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Section title="Personal Information" icon={<User className="h-4 w-4" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="First Name *" value={form.first_name} onChange={set('first_name')} required />
            <Field label="Last Name *"  value={form.last_name}  onChange={set('last_name')}  required />
            <Field label="Date of Birth" type="date" value={form.date_of_birth} onChange={set('date_of_birth')} />
            <Select label="Gender" value={form.gender} onChange={set('gender')}
              options={['male', 'female', 'other']} />
            <Select label="Blood Type" value={form.blood_type} onChange={set('blood_type')}
              options={['A+','A-','B+','B-','AB+','AB-','O+','O-']} />
          </div>
        </Section>

        <Section title="Contact Information" icon={<Phone className="h-4 w-4" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Phone Number" value={form.phone_number} onChange={set('phone_number')} />
            <Field label="Email" type="email" value={form.email} onChange={set('email')} />
            <div className="sm:col-span-2">
              <Field label="Address" value={form.address} onChange={set('address')} />
            </div>
          </div>
        </Section>

        <Section title="Emergency & Insurance" icon={<ShieldAlert className="h-4 w-4" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Emergency Contact Name"  value={form.emergency_contact_name}  onChange={set('emergency_contact_name')} />
            <Field label="Emergency Contact Phone" value={form.emergency_contact_phone} onChange={set('emergency_contact_phone')} />
            <div className="sm:col-span-2">
              <Field label="Insurance Provider" value={form.insurance_provider} onChange={set('insurance_provider')} />
            </div>
          </div>
        </Section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-xl
                       text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-4">
        <span className="text-gray-500">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required = false }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm
                   text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <select
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm
                   text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">Select…</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
