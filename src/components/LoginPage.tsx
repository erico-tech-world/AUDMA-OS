import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { authApi } from '../lib/api/client';
import { useTheme } from '../domains/core/theme-context';

interface LoginPageProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  const isDark = theme === 'dark';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await authApi.login(email, password);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(
        err.code === 'INVALID_CREDENTIALS'
          ? 'Invalid email or password. Please try again.'
          : err.error || 'Login failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${window.location.origin}/api/auth/oidc/callback?provider=google`;
  };

  const handleMicrosoftLogin = () => {
    window.location.href = `${window.location.origin}/api/auth/oidc/callback?provider=microsoft`;
  };

  const handleOIDCLogin = () => {
    window.location.href = `${window.location.origin}/api/auth/oidc/callback?provider=microsoft`;
  };

  const handleForgotPassword = () => {
    setShowForgotPasswordModal(true);
  };

  const handleCloseForgotPasswordModal = () => {
    setShowForgotPasswordModal(false);
  };

  return (
    <div
      className={`min-h-screen w-full flex ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}
    >
      {/* Left Panel: Enterprise SSO Primary (Split-Screen Left) */}
      <div className="hidden lg:flex lg:w-1/2 h-screen flex-col">
        <div className="flex-1 relative overflow-hidden bg-indigo-900/80">
          {/* Decorative background pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              <pattern
                id="grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path d="M 40 0 L 0 0 0 40" fill="currentColor" strokeOpacity="0.1" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {/* Top Left Badge */}
          <div className="absolute top-6 left-6 flex items-center gap-1">
            <span className="text-[10px] font-mono font-bold text-indigo-200 uppercase tracking-wider">
              AUDMA OS ENTERPRISE
            </span>
          </div>

          {/* Center Content */}
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-8">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 002-2H9.5l-.6 8H5a2 2 0 01-2-2V5a2 2 0 012-2h3l.6 8H12m7 4h-3m0 0v-3m3 0h-3m3 0v-3m3 0H21" />
              </svg>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white mb-3">
              Enterprise Login
            </h1>
            <p className="text-indigo-100 dark:text-indigo-200 mb-8 text-center max-w-md">
              Authenticate with your corporate Identity Provider.<br />
              Password management is handled by your organization&rsquo;s IdP.
            </p>

            {/* SSO Options - Primary Authentication */}
            <div className="space-y-3 w-full max-w-md">
              <button
                onClick={handleGoogleLogin}
                className="w-full py-3 rounded-xl bg-white hover:bg-indigo-50 text-indigo-900 font-medium flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <img src="https://fonts.gstatic.com/s/i/shortterm/googleg/svg/logo_id_googleg.svg" alt="Google" className="w-4 h-4" />
                Sign in with Google Workspace
              </button>
              <button
                onClick={handleMicrosoftLogin}
                className="w-full py-3 rounded-xl bg-white hover:bg-indigo-50 text-indigo-900 font-medium flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <svg className="w-4 h-4 text-black dark:text-black" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.53 3.556c-.242-.01-.492-.01-.733-.01-.273 0-.543 0-.815.01-1.257.046-2.327.344-2.985.866-.648.516-1.035 1.365-1.035 2.262v.89c0 .173-.017.342-.027.511a4 4 0 01-.056.756c-.032.346-.075.635-.075.635s-.459.957-.459 1.715v.418c0 .74.135 1.314.41 1.728.29.43.718.776 1.193.945a6 6 0 001.186.212c.015 0 .032-.005.047-.005.488-.005.974-.019 1.452-.064l.055-.005.021-.006c1.073-.135 1.992-.523 2.536-1.137l.066-.074c.276-.314.48-.693.582-1.095l.006-.023c.027-.505.052-1.003.052-1.508v-.39c0-.217.014-.431.027-.646a4 4 0 01.056-.756c.01-.169.027-.338.027-.511v-.89c0-.897-.387-1.746-1.035-2.262-.658-.522-1.728-.82-2.985-.866-.273-.01-.542-.01-.815-.01-.241 0-.491 0-.733.01-1.077.038-1.992.278-2.597.69-.597.407-.965 1.079-.965 1.835v.886c0 .155-.015.307-.024.459a3 3 0 01-.045.608c-.021.223-.049.411-.049.411s-.319.656-.319 1.189v.298c0 .514.093.912.284 1.202.198.302.496.539.829.655a4 4 0 00.82.146c.01 0 .021-.003.031-.003.337-.003.671-.013 1.001-.044l.038-.003.015-.004c.74-.093 1.374-.361 1.749-.784l.045-.051c.19-.217.331-.478.401-.755l.004-.016c.019-.348.036-.692.036-1.04v-.27c0-.15.01-.298.019-.445a3 3 0 01.04-.522c.007-.117.019-.233.019-.351v-.612c0-.62-.268-1.207-.716-1.59-.448-.38-1.193-.567-2.061-.596-.188-.007-.373-.007-.561-.007-.166 0-.339 0-.506.007-.742.029-1.373.219-1.795.475-.416.254-.672.669-.672 1.127v.601c0 .103-.01.204-.016.306a2 2 0 01-.03.405c-.014.149-.033.275-.033.275s-.22.439-.22.827v.206c0 .352.064.625.194.825.136.207.341.369.57.452a3 3 0 00.564.1c.007 0 .014-.002.021-.002.225-.002.448-.009.668-.029l.025-.002.01-.003c.493-.063.917-.247 1.206-.528l.031-.035c.127-.145.22-.33.266-.519l.002-.01c.013-.239.025-.476.025-.715v-.186c0-.341-.018-.675-.05-1.005-.031-.328-.089-.653-.173-.975-.085-.322-.2-.64-.343-.952l-.01-.022a4 4 0 00-.515-.793c-.034-.045-.073-.087-.108-.132l-.046-.06c-.354-.461-.863-.845-1.49-1.103-.62-.255-1.325-.389-2.104-.389-.13 0-.255 0-.381.005-.758.032-1.402.196-1.936.428-.525.228-.849.59-.849 1.018v.54c0 .092-.009.182-.014.273a2 2 0 01-.027.361c-.012.133-.029.245-.029.245s-.196.392-.196.738v.184c0 .314.057.558.173.735.121.185.304.33.508.403a3 3 0 00.503.09c.006 0 .012-.002.019-.002.201-.002.4-.008.596-.026l.022-.002.009-.003c.44-.056.817-.22 1.077-.471l.028-.031c.113-.129.196-.294.237-.463l.002-.009c.012-.239.022-.424.022-.638v-.166c0-.304-.016-.602-.044-.897-.028-.293-.079-.583-.154-.87-.076-.287-.179-.571-.306-.849l-.009-.02a4 4 0 00-.46-.707c-.03-.04-.065-.078-.096-.118z" />
                </svg>
                Sign in with Microsoft Entra ID
              </button>
              <button
                onClick={handleOIDCLogin}
                className="w-full py-3 rounded-xl border border-indigo-300 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700 font-medium flex items-center justify-center gap-2 transition-all"
              >
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16.5l-3-3m0 0l3-3m-3 3l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Enterprise SSO (SAML 2.0)
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-indigo-300/30">
              <p className="text-xs text-indigo-300 dark:text-indigo-200 text-center">
                SSO login automatically provisions your AUDMA OS account<br />
                and maps your corporate role-based permissions.
              </p>
            </div>
          </div>

          {/* Bottom gradient */}
          <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-indigo-900/90 via-transparent to-transparent" />
        </div>
      </div>

      {/* Right Panel: Administrator Credential Fallback (Split-Screen Right) */}
      <div className={`flex lg:flex-1 lg:w-1/2 flex-col justify-center p-8 lg:p-0 ${isDark ? 'bg-slate-950' : 'bg-white'}`}>
        <div className="w-full max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Administrator Access
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Use email &amp; password for initial system setup.
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2 animate-pulse">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@audma.enterprise"
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:opacity-60"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 disabled:opacity-60"
                  disabled={loading}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:opacity-60"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                  className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 disabled:opacity-60"
                  disabled={loading}
                />
                Remember Me
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 underline"
              >
                Forgot Password
              </button>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-200 text-white font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                  <span>Log In</span>
                </>
              )}
            </button>
          </form>

          {/* Footer - No public registration */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
            <p className="text-[11px] text-center text-slate-500 dark:text-slate-400">
              Administrator credentials only. All staff accounts<br />
              are provisioned through corporate Identity Provider.
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-z-index-50 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 rounded-xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 002-2H9.5l-.6 8H5a2 2 0 01-2-2V5a2 2 0 012-2h3l.6 8H12m7 4h-3m0 0v-3m3 0h-3m3 0v-3m3 0H21" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">
              Authentication Managed by Corporate IdP
            </h3>
            <p className="text-slate-400 mb-6 text-sm">
              Password and authentication management are handled by your
              corporate Identity Provider (Google Workspace, Microsoft Entra ID,
              or your organization&rsquo;s SAML 2.0 provider).
            </p>
            <div className="space-y-2 text-left">
              <p className="text-sm font-medium text-white">
                To reset your credentials:
              </p>
              <ul className="list-disc list-inside text-slate-400 text-sm space-y-1">
                <li>Contact your system administrator</li>
                <li>Use your IdP account recovery portal</li>
                <li>Request account provisioning through your HR department</li>
              </ul>
            </div>
            <button
              onClick={handleCloseForgotPasswordModal}
              className="mt-6 py-2 px-4 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-all w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
