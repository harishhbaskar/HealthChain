import { useState } from 'react';
import { Shield, Eye, EyeOff } from 'lucide-react';

function AuthPage({
  view,
  username,
  password,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
  onToggleView
}) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-500/20 p-3 rounded-full">
            <Shield className="w-10 h-10 text-blue-500" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-100 mb-1">
          HealthChain Bridge
        </h2>
        <p className="text-center text-sm text-gray-500 mb-6">
          {view === 'login' ? 'Sign in to your account' : 'Create a new account'}
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
            <input
              type="text"
              className="w-full bg-gray-900 border border-gray-700 text-gray-100 placeholder-gray-500 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter username"
              value={username}
              onChange={onUsernameChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full bg-gray-900 border border-gray-700 text-gray-100 placeholder-gray-500 rounded-lg px-3 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter password"
                value={password}
                onChange={onPasswordChange}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-300 transition"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {view === 'register' && (
            <div className="rounded-lg border border-gray-700 bg-gray-900/60 px-3 py-2.5">
              <p className="text-sm text-gray-300">Public signup creates Patient accounts only.</p>
              <p className="text-xs text-gray-500 mt-1">
                Doctor accounts are provisioned by Admin from Doctor Management.
              </p>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
          >
            {view === 'login' ? 'Sign In' : 'Register'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={onToggleView} className="text-sm text-blue-400 hover:text-blue-300 transition">
            {view === 'login' ? "Don't have an account? Register" : 'Already have an account? Login'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
