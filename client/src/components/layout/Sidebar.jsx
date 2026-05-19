import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Stethoscope,
  Users,
  Calendar,
  ClipboardList,
  Link2,
  UserCog,
  LogOut,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const DOCTOR_NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clinical', icon: Stethoscope, label: 'Clinical' },
  { to: '/patients', icon: Users, label: 'Patients' },
  { to: '/scheduler', icon: Calendar, label: 'Scheduler' },
  { to: '/blockchain', icon: Link2, label: 'Blockchain' },
  { to: '/audit', icon: ClipboardList, label: 'Audit Logs' },
];

const ADMIN_NAV_ITEMS = [
  { to: '/admin', icon: UserCog, label: 'Admin Panel' },
  { to: '/admin/doctors', icon: Users, label: 'Doctor Management' },
  { to: '/admin/audit', icon: ClipboardList, label: 'Audit Center' },
  { to: '/admin/blockchain', icon: Link2, label: 'Blockchain Monitor' },
];

const PATIENT_NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clinical', icon: Stethoscope, label: 'Clinical' },
];

export default function Sidebar({ user, onLogout, theme = 'light', onToggleTheme }) {
  const [collapsed, setCollapsed] = useState(false);

  const isDoctor = user?.role === 'doctor' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  const visibleItems = isAdmin
    ? ADMIN_NAV_ITEMS
    : isDoctor
    ? DOCTOR_NAV_ITEMS
    : PATIENT_NAV_ITEMS;

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-white border-r border-gray-300 shadow-sm transition-all duration-300 ${
        collapsed ? 'w-17' : 'w-60'
      }`}
    >
      {/* ---- Brand ---- */}
      <div className="flex items-center gap-2 px-4 h-16 border-b border-gray-300 shrink-0">
        <Shield className="h-7 w-7 text-blue-500 shrink-0" />
        {!collapsed && (
          <span className="text-lg font-bold text-gray-900 whitespace-nowrap">
            HealthChain
          </span>
        )}
      </div>

      {/* ---- Navigation ---- */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {visibleItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
              }`
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="whitespace-nowrap">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* ---- Bottom section ---- */}
      <div className="border-t border-gray-300 px-2 py-3 space-y-2 shrink-0">
        {/* User pill */}
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-blue-400">
              {user?.username?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.username}
              </p>
              <p className="text-xs text-gray-600 capitalize">{user?.role}</p>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>

        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? (
            <Moon className="h-5 w-5 shrink-0" />
          ) : (
            <Sun className="h-5 w-5 shrink-0" />
          )}
          {!collapsed && <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center justify-center w-full py-1.5 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
