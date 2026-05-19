import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  ClipboardList,
  Link2,
  ArrowRight,
  UserCog,
} from 'lucide-react';
import DashboardHome from './DashboardHome';

export default function AdminPanel({ token, user }) {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-blue-500" />
          Admin Panel
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Centralized administrative view for platform health, compliance, and blockchain integrity.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickAdminLink
          to="/admin/audit"
          icon={<ClipboardList className="h-5 w-5 text-emerald-400" />}
          title="Audit Center"
          description="Review and filter compliance logs"
        />
        <QuickAdminLink
          to="/admin/blockchain"
          icon={<Link2 className="h-5 w-5 text-violet-400" />}
          title="Blockchain Monitor"
          description="Validate chain integrity and records"
        />
        <QuickAdminLink
          to="/admin/doctors"
          icon={<UserCog className="h-5 w-5 text-amber-400" />}
          title="Doctor Management"
          description="Create and update doctor accounts"
        />
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
        <h2 className="text-base font-semibold text-gray-100 flex items-center gap-2">
          <UserCog className="h-4.5 w-4.5 text-amber-400" />
          Admin Overview
        </h2>
        <p className="text-sm text-gray-400 mt-1 mb-4">
          Reusing the existing dashboard module to keep the admin experience consistent with the rest of the product.
        </p>

        <DashboardHome token={token} user={user} />
      </div>
    </div>
  );
}

function QuickAdminLink({ to, icon, title, description }) {
  return (
    <Link
      to={to}
      className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-blue-500/50 hover:bg-gray-800/80 transition-all group"
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          {icon}
          <h3 className="text-sm font-semibold text-gray-200 group-hover:text-gray-100">{title}</h3>
        </div>
        <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-blue-400 transition-colors" />
      </div>
      <p className="text-xs text-gray-500">{description}</p>
    </Link>
  );
}
