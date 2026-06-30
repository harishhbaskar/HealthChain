import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast, { Toaster, resolveValue } from 'react-hot-toast';

import AuthPage from './pages/AuthPage';
import DashboardHome from './pages/DashboardHome';
import Sidebar from './components/layout/Sidebar';
import PatientInfoBanner from './components/records/PatientInfoBanner';
import RecordsList from './components/records/RecordsList';
import PatientDirectory from './components/records/PatientDirectory';
import Scheduler from './components/records/Scheduler';
import AuditLogs from './pages/AuditLogs';
import BlockchainExplorer from './pages/BlockchainExplorer';
import PatientProfile from './pages/PatientProfile';
import ClinicalWorkstation from './pages/ClinicalWorkstation';
import AdminPanel from './pages/AdminPanel';
import AdminDoctors from './pages/AdminDoctors';
import { API_URL } from './constants/api';
import { initialSoapForm } from './utils/soap';

// Safe JSON parse helper
const safeJsonParse = (str, fallback = null) => {
  try {
    return str ? JSON.parse(str) : fallback;
  } catch {
    return fallback;
  }
};

function App() {
  const navigate = useNavigate();

  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(safeJsonParse(localStorage.getItem('user')));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [soapForm, setSoapForm] = useState(initialSoapForm);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patients, setPatients] = useState([]);
  const [records, setRecords] = useState([]);
  const [verificationStatus, setVerificationStatus] = useState({});
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Auto-logout on 401 (expired/invalid token)
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err.response?.status === 401) {
          setToken(null);
          setUser(null);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setRecords([]);
          setPatients([]);
        }
        return Promise.reject(err);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  // ---- data fetchers ----
  const authHeaders = (t) => ({ headers: { Authorization: `Bearer ${t || token}` } });

  const fetchRecords = async (authToken, patId = null) => {
    try {
      const url = patId ? `${API_URL}/records?patientId=${patId}` : `${API_URL}/records`;
      const res = await axios.get(url, authHeaders(authToken));
      setRecords(res.data);
    } catch (err) {
      console.error('Error fetching records', err);
    }
  };

  const fetchPatients = async (authToken) => {
    try {
      const res = await axios.get(`${API_URL}/patients?limit=100`, authHeaders(authToken));
      const list = res.data.data || res.data;
      setPatients(list);
      if (list.length) setSelectedPatientId(list[0].id);
    } catch (err) {
      console.error('Error fetching patients', err);
    }
  };

  useEffect(() => {
    if (token) {
      const storedUser = safeJsonParse(localStorage.getItem('user'));
      if (storedUser?.role === 'doctor') {
        fetchPatients(token);
      } else if (storedUser?.role === 'patient') {
        fetchRecords(token);
      }
    }
  }, [token]);

  useEffect(() => {
    if (token && selectedPatientId) {
      fetchRecords(token, selectedPatientId);
    }
  }, [selectedPatientId]);

  // ---- auth handlers ----
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/login`, { username, password });
      const receivedToken = res.data.token;
      const receivedUser = res.data.user;

      setToken(receivedToken);
      setUser(receivedUser);
      localStorage.setItem('token', receivedToken);
      localStorage.setItem('user', JSON.stringify(receivedUser));

      if (receivedUser.role === 'patient') {
        fetchRecords(receivedToken);
      }
      if (receivedUser.role === 'doctor') {
        fetchPatients(receivedToken);
      }

      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error('Login Failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/register`, { username, password });

      const loginRes = await axios.post(`${API_URL}/login`, { username, password });
      const receivedToken = loginRes.data.token;
      const receivedUser = loginRes.data.user;

      setToken(receivedToken);
      setUser(receivedUser);
      localStorage.setItem('token', receivedToken);
      localStorage.setItem('user', JSON.stringify(receivedUser));

      if (receivedUser.role === 'patient') {
        fetchRecords(receivedToken);
      }
      if (receivedUser.role === 'doctor') {
        fetchPatients(receivedToken);
      }

      toast.success('Registered successfully!');
      navigate('/');
    } catch (err) {
      toast.error('Registration Failed: ' + (err.response?.data?.error || err.message));
    }
  };

  // ---- record handlers ----
  const addRecord = async (e) => {
    e.preventDefault();

    if (!soapForm.assessment.trim()) {
      toast.error('Assessment (Diagnosis) is required.');
      return;
    }
    if (!selectedPatientId) {
      toast.error('Please select a patient.');
      return;
    }

    try {
      await axios.post(
        `${API_URL}/records`,
        {
          patient_id: selectedPatientId,
          subjective: soapForm.subjective,
          vitals: soapForm.vitals,
          assessment: soapForm.assessment,
          plan: soapForm.plan,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSoapForm(initialSoapForm);
      fetchRecords(token, selectedPatientId);
      toast.success('Record saved to Blockchain!');
    } catch (err) {
      toast.error(
        'Failed: ' +
          (err.response?.data?.error || err.response?.data?.message || 'Unauthorized')
      );
    }
  };

  const verifyRecord = async (id) => {
    setVerificationStatus((prev) => ({ ...prev, [id]: 'loading' }));
    try {
      const res = await axios.get(`${API_URL}/verify/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

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

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setRecords([]);
    setPatients([]);
    navigate('/login');
  };

  // ---- render: unauthenticated ----
  if (!token) {
    return (
      <>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1f2937', color: '#f3f4f6', border: '1px solid #374151' },
            duration: 4000,
          }}
        >
          {(t) => (
            <div
              className={`${
                t.visible ? 'animate-enter' : 'animate-leave'
              } flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border max-w-sm w-full`}
              style={{ background: '#1f2937', color: '#f3f4f6', border: '1px solid #374151' }}
            >
              <span className="shrink-0">
                {t.type === 'success' ? '\u2705' : t.type === 'error' ? '\u26A0\uFE0F' : ''}
              </span>
              <span className="flex-1 text-sm">{resolveValue(t.message, t)}</span>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="text-gray-400 hover:text-gray-200 shrink-0 text-lg leading-none ml-1"
              >
                &times;
              </button>
            </div>
          )}
        </Toaster>
        <Routes>
          <Route
            path="/login"
            element={
              <AuthPage
                view="login"
                username={username}
                password={password}
                onUsernameChange={(e) => setUsername(e.target.value)}
                onPasswordChange={(e) => setPassword(e.target.value)}
                onSubmit={handleLogin}
                onToggleView={() => navigate('/register')}
              />
            }
          />
          <Route
            path="/register"
            element={
              <AuthPage
                view="register"
                username={username}
                password={password}
                onUsernameChange={(e) => setUsername(e.target.value)}
                onPasswordChange={(e) => setPassword(e.target.value)}
                onSubmit={handleRegister}
                onToggleView={() => navigate('/login')}
              />
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </>
    );
  }

  // ---- render: authenticated (sidebar + content) ----
  const isDoctor = user?.role === 'doctor';
  const isAdmin = user?.role === 'admin';

  return (
    <div className={`${theme === 'light' ? 'light-mode' : 'dark-mode'} min-h-screen`}
         style={{ background: theme === 'light' ? 'var(--bg-0, #f0f4ff)' : 'var(--bg-0)' }}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1f2937', color: '#f3f4f6', border: '1px solid #374151' },
          duration: 4000,
        }}
      >
        {(t) => (
          <div
            className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border max-w-sm w-full`}
            style={{ background: '#1f2937', color: '#f3f4f6', border: '1px solid #374151' }}
          >
            <span className="shrink-0">
              {t.type === 'success' ? '\u2705' : t.type === 'error' ? '\u26A0\uFE0F' : ''}
            </span>
            <span className="flex-1 text-sm">{resolveValue(t.message, t)}</span>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="text-gray-400 hover:text-gray-200 shrink-0 text-lg leading-none ml-1"
            >
              &times;
            </button>
          </div>
        )}
      </Toaster>

      {/* Sidebar */}
      <Sidebar
        user={user}
        onLogout={logout}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
        onCollapseChange={setSidebarCollapsed}
      />

      {/* Main content area — offset by sidebar width */}
      <div
        className="min-h-screen content-area bg-grid"
        style={{
          marginLeft: sidebarCollapsed ? 68 : 240,
          transition: 'margin-left 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div className="max-w-7xl mx-auto py-8 px-6 lg:px-10">
          <Routes>
            {/* Dashboard Home */}
            <Route
              path="/"
              element={
                isAdmin ? (
                  <Navigate to="/admin" replace />
                ) : (
                  <DashboardHome
                    token={token}
                    user={user}
                  />
                )
              }
            />

            {/* Clinical — Workstation (SOAP + Records side-by-side) */}
            <Route
              path="/clinical"
              element={
                isDoctor ? (
                  <ClinicalWorkstation token={token} />
                ) : (
                  <>
                    <PatientInfoBanner />
                    <RecordsList
                      records={records}
                      verificationStatus={verificationStatus}
                      onVerifyRecord={verifyRecord}
                    />
                  </>
                )
              }
            />

            {/* Admin panel (admin only) */}
            <Route
              path="/admin"
              element={
                isAdmin ? (
                  <AdminPanel token={token} user={user} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            {/* Admin: Audit Center */}
            <Route
              path="/admin/audit"
              element={
                isAdmin ? (
                  <AuditLogs token={token} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            {/* Admin: Blockchain Monitor */}
            <Route
              path="/admin/blockchain"
              element={
                isAdmin ? (
                  <BlockchainExplorer token={token} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            {/* Admin: Doctor Management */}
            <Route
              path="/admin/doctors"
              element={
                isAdmin ? (
                  <AdminDoctors token={token} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            {/* Patient Directory (doctor only) */}
            <Route
              path="/patients"
              element={
                isDoctor ? (
                  <PatientDirectory token={token} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            {/* Patient Profile (doctor only) */}
            <Route
              path="/patients/:id"
              element={
                isDoctor ? (
                  <PatientProfile token={token} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            {/* Scheduler (doctor only) */}
            <Route
              path="/scheduler"
              element={
                isDoctor ? (
                  <Scheduler token={token} patients={patients} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            {/* Blockchain Explorer */}
            <Route
              path="/blockchain"
              element={
                isDoctor ? (
                  <BlockchainExplorer token={token} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            {/* Audit Logs (doctor only) */}
            <Route
              path="/audit"
              element={
                isDoctor ? (
                  <AuditLogs token={token} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default App;