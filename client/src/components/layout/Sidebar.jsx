import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { gsap } from 'gsap';
import {
  Shield, LayoutDashboard, Stethoscope, Users, Calendar,
  ClipboardList, Link2, UserCog, LogOut, Sun, Moon,
  ChevronLeft, ChevronRight, Activity,
} from 'lucide-react';

const DOCTOR_NAV = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/clinical',   icon: Stethoscope,     label: 'Clinical'   },
  { to: '/patients',   icon: Users,           label: 'Patients'   },
  { to: '/scheduler',  icon: Calendar,        label: 'Scheduler'  },
  { to: '/blockchain', icon: Link2,           label: 'Blockchain' },
  { to: '/audit',      icon: ClipboardList,   label: 'Audit Logs' },
];

const ADMIN_NAV = [
  { to: '/admin',            icon: UserCog,       label: 'Admin Panel'      },
  { to: '/admin/doctors',    icon: Users,         label: 'Doctor Management'},
  { to: '/admin/audit',      icon: ClipboardList, label: 'Audit Center'     },
  { to: '/admin/blockchain', icon: Link2,         label: 'Blockchain'       },
];

const PATIENT_NAV = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clinical', icon: Stethoscope,     label: 'My Records'},
];

const ROLE_COLOR = {
  doctor:  { bg: 'from-blue-500/20 to-indigo-500/20',  text: 'text-blue-300',   dot: 'bg-blue-400'   },
  admin:   { bg: 'from-violet-500/20 to-purple-500/20', text: 'text-violet-300', dot: 'bg-violet-400' },
  patient: { bg: 'from-cyan-500/20 to-teal-500/20',    text: 'text-cyan-300',   dot: 'bg-cyan-400'   },
};

export default function Sidebar({ user, onLogout, theme = 'dark', onToggleTheme, onCollapseChange }) {
  const [collapsed, setCollapsed] = useState(false);
  const sidebarRef = useRef(null);
  const logoRef    = useRef(null);

  const isAdmin  = user?.role === 'admin';
  const isDoctor = user?.role === 'doctor' || isAdmin;
  const navItems = isAdmin ? ADMIN_NAV : isDoctor ? DOCTOR_NAV : PATIENT_NAV;
  const role     = user?.role || 'patient';
  const rc       = ROLE_COLOR[role] || ROLE_COLOR.patient;

  /* Logo pulse on mount */
  useEffect(() => {
    gsap.fromTo(logoRef.current,
      { opacity: 0, scale: 0.8 },
      { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.5)', delay: 0.1 }
    );
  }, []);

  /* Animate sidebar width change */
  const toggleCollapse = () => {
    const next = !collapsed;
    gsap.to(sidebarRef.current, {
      width: next ? 68 : 240,
      duration: 0.3,
      ease: 'power2.inOut',
    });
    setCollapsed(next);
    onCollapseChange?.(next);
  };

  const initials = user?.username?.charAt(0)?.toUpperCase() || '?';

  return (
    <aside
      ref={sidebarRef}
      style={{ width: collapsed ? 68 : 240 }}
      className="fixed inset-y-0 left-0 z-40 flex flex-col glass-sidebar overflow-hidden
                 transition-none"
    >
      {/* ── Brand ── */}
      <div className="relative flex items-center gap-3 px-4 h-16 shrink-0
                      border-b border-white/5">
        {/* Glow behind logo */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10
                        bg-blue-500/20 blur-xl rounded-full pointer-events-none" />

        <div ref={logoRef}
             className="relative h-9 w-9 rounded-xl gradient-bg flex items-center
                        justify-center shadow-lg shadow-blue-500/30 shrink-0">
          <Shield className="h-5 w-5 text-white" />
        </div>

        {!collapsed && (
          <div className="overflow-hidden">
            <span className="text-sm font-bold gradient-text whitespace-nowrap">
              HealthChain
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <Activity className="h-2.5 w-2.5 text-emerald-400" />
              <span className="text-[10px] text-emerald-400/80 font-medium">System Online</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {!collapsed && (
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest
                        text-slate-600">
            Navigation
          </p>
        )}
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer
               ${isActive ? 'nav-active' : ''}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={`nav-icon h-4.5 w-4.5 shrink-0 transition-colors
                    ${isActive ? 'text-blue-400' : 'text-slate-500'}`}
                />
                {!collapsed && (
                  <span
                    className={`nav-label text-sm font-medium whitespace-nowrap transition-colors
                      ${isActive ? 'text-slate-100' : 'text-slate-400'}`}
                  >
                    {label}
                  </span>
                )}
                {isActive && !collapsed && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400
                                  shadow-[0_0_6px_rgba(96,165,250,0.8)]" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Bottom section ── */}
      <div className="border-t border-white/5 px-2 py-3 space-y-1 shrink-0">

        {/* User pill */}
        <div className={`flex items-center gap-2.5 px-2 py-2 rounded-lg
                        bg-linear-to-r ${rc.bg}`}>
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className={`h-8 w-8 rounded-lg bg-linear-to-br from-blue-500 to-indigo-600
                            flex items-center justify-center text-xs font-bold text-white
                            shadow-md`}>
              {initials}
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full
                            ${rc.dot} border-2 border-slate-900`} />
          </div>
          {!collapsed && (
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-semibold text-slate-200 truncate">
                {user?.username}
              </p>
              <p className={`text-xs font-medium capitalize ${rc.text}`}>
                {role}
              </p>
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          className="nav-item flex items-center gap-3 w-full px-3 py-2 rounded-lg"
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark'
            ? <Sun  className="nav-icon h-4 w-4 shrink-0 text-amber-400" />
            : <Moon className="nav-icon h-4 w-4 shrink-0 text-slate-400" />
          }
          {!collapsed && (
            <span className="nav-label text-sm text-slate-400">
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </span>
          )}
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="nav-item flex items-center gap-3 w-full px-3 py-2 rounded-lg
                     group"
        >
          <LogOut className="nav-icon h-4 w-4 shrink-0 text-slate-500
                             group-hover:text-rose-400 transition-colors" />
          {!collapsed && (
            <span className="nav-label text-sm text-slate-400
                             group-hover:text-rose-400 transition-colors">
              Sign Out
            </span>
          )}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={toggleCollapse}
          className="nav-item flex items-center justify-center w-full py-2 rounded-lg"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed
            ? <ChevronRight className="h-4 w-4 text-slate-500" />
            : <ChevronLeft  className="h-4 w-4 text-slate-500" />
          }
        </button>
      </div>
    </aside>
  );
}
