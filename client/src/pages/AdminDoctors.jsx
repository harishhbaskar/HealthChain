import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Loader2,
  Save,
  PlusCircle,
  UserCog,
  Sparkles,
  UserRound,
  KeyRound,
  Stethoscope,
} from 'lucide-react';
import { API_URL } from '../constants/api';

export default function AdminDoctors({ token }) {
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updatingDoctorId, setUpdatingDoctorId] = useState(null);
  const [editingDoctorId, setEditingDoctorId] = useState(null);

  const [createForm, setCreateForm] = useState({
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    specialty: 'General Practice',
  });

  const [editForm, setEditForm] = useState({
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    specialty: 'General Practice',
  });

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const fetchDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const res = await axios.get(`${API_URL}/admin/doctors`, authHeaders);
      setDoctors(res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load doctors');
    } finally {
      setLoadingDoctors(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [token]);

  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await axios.post(`${API_URL}/admin/doctors`, createForm, authHeaders);
      toast.success('Doctor created successfully');
      setCreateForm({
        username: '',
        password: '',
        first_name: '',
        last_name: '',
        specialty: 'General Practice',
      });
      fetchDoctors();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create doctor');
    } finally {
      setCreating(false);
    }
  };

  const startEditDoctor = (doctor) => {
    setEditingDoctorId(doctor.id);
    setEditForm({
      username: doctor.username || '',
      password: '',
      first_name: doctor.first_name || '',
      last_name: doctor.last_name || '',
      specialty: doctor.specialty || 'General Practice',
    });
  };

  const handleUpdateDoctor = async (e) => {
    e.preventDefault();
    if (!editingDoctorId) return;

    setUpdatingDoctorId(editingDoctorId);
    try {
      await axios.put(`${API_URL}/admin/doctors/${editingDoctorId}`, editForm, authHeaders);
      toast.success('Doctor updated successfully');
      setEditingDoctorId(null);
      setEditForm({
        username: '',
        password: '',
        first_name: '',
        last_name: '',
        specialty: 'General Practice',
      });
      fetchDoctors();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update doctor');
    } finally {
      setUpdatingDoctorId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-3">
          <UserCog className="h-7 w-7 text-blue-500" />
          Doctor Management
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Create and update doctor accounts from one place.
        </p>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl">
        <div className="p-5 md:p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/15 text-blue-300 border border-blue-500/30">
                <Sparkles className="h-3.5 w-3.5" />
                New Doctor Access
              </div>
              <h2 className="text-lg font-semibold text-gray-100 mt-3">Create Doctor Account</h2>
              <p className="text-sm text-gray-400 mt-1">
                Provision a new doctor with login credentials and profile metadata.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-gray-400">
              <div className="px-2.5 py-2 rounded-lg bg-gray-900/70 border border-gray-700 text-center">1. Identity</div>
              <div className="px-2.5 py-2 rounded-lg bg-gray-900/70 border border-gray-700 text-center">2. Access</div>
              <div className="px-2.5 py-2 rounded-lg bg-gray-900/70 border border-gray-700 text-center">3. Specialty</div>
            </div>
          </div>

          <form onSubmit={handleCreateDoctor} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FieldLabel icon={<UserRound className="h-3.5 w-3.5" />} label="Username">
                <input
                  type="text"
                  placeholder="e.g. dr_stevens"
                  value={createForm.username}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, username: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500"
                  required
                />
              </FieldLabel>

              <FieldLabel icon={<KeyRound className="h-3.5 w-3.5" />} label="Password">
                <input
                  type="password"
                  placeholder="Temporary password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500"
                  required
                />
              </FieldLabel>

              <FieldLabel label="First name">
                <input
                  type="text"
                  placeholder="First name"
                  value={createForm.first_name}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, first_name: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500"
                  required
                />
              </FieldLabel>

              <FieldLabel label="Last name">
                <input
                  type="text"
                  placeholder="Last name"
                  value={createForm.last_name}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, last_name: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500"
                  required
                />
              </FieldLabel>
            </div>

            <FieldLabel icon={<Stethoscope className="h-3.5 w-3.5" />} label="Specialty">
              <input
                type="text"
                placeholder="e.g. Cardiology"
                value={createForm.specialty}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, specialty: e.target.value }))}
                className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500"
              />
            </FieldLabel>

            <div className="pt-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-xs text-gray-500">
                Tip: share a temporary password and ask the doctor to reset it after first login.
              </p>
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm font-medium"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                {creating ? 'Creating doctor...' : 'Create doctor'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-100">Manage Doctors</h2>
          <p className="text-sm text-gray-400 mt-1">Edit doctor profile and login details.</p>
        </div>

        {loadingDoctors ? (
          <div className="py-8 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
          </div>
        ) : !doctors.length ? (
          <p className="text-sm text-gray-500">No doctors found.</p>
        ) : (
          <div className="space-y-3">
            {doctors.map((doctor) => (
              <div key={doctor.id} className="border border-gray-700 rounded-lg p-4 bg-gray-900/40">
                {editingDoctorId === doctor.id ? (
                  <form onSubmit={handleUpdateDoctor} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Username"
                      value={editForm.username}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, username: e.target.value }))}
                      className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100"
                      required
                    />
                    <input
                      type="password"
                      placeholder="New password (optional)"
                      value={editForm.password}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
                      className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100"
                    />
                    <input
                      type="text"
                      placeholder="First name"
                      value={editForm.first_name}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, first_name: e.target.value }))}
                      className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Last name"
                      value={editForm.last_name}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, last_name: e.target.value }))}
                      className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Specialty"
                      value={editForm.specialty}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, specialty: e.target.value }))}
                      className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 md:col-span-2"
                    />
                    <div className="md:col-span-2 flex gap-2">
                      <button
                        type="submit"
                        disabled={updatingDoctorId === doctor.id}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm"
                      >
                        {updatingDoctorId === doctor.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Save changes
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingDoctorId(null)}
                        className="px-3 py-2 rounded-lg border border-gray-600 text-gray-300 text-sm hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-100">
                        Dr. {doctor.first_name} {doctor.last_name}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">@{doctor.username} • {doctor.specialty || 'General Practice'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startEditDoctor(doctor)}
                      className="px-3 py-2 rounded-lg border border-gray-600 text-gray-300 text-sm hover:bg-gray-700"
                    >
                      Edit doctor
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FieldLabel({ label, icon, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs text-gray-400 font-medium inline-flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}
