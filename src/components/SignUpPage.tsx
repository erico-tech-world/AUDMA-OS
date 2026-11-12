import React from 'react';

interface SignUpPageProps {
  onSignUpSuccess: (user: any) => void;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({ onSignUpSuccess }) => {

  return (
    <div className="min-h-screen w-full flex bg-slate-50 dark:bg-slate-950">
      {/* Left Panel: Enterprise Provisioning Message */}
      <div className="hidden lg:flex lg:w-1/2 h-screen flex-col">
        <div className="flex-1 relative overflow-hidden bg-indigo-900/80">
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="currentColor" strokeOpacity="0.1" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          <div className="absolute top-6 left-6 flex items-center gap-1">
            <span className="text-[10px] font-mono font-bold text-indigo-200 uppercase tracking-wider">
              AUDMA OS ENTERPRISE
            </span>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-8">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 002-2H9.5l-.6 8H5a2 2 0 01-2-2V5a2 2 0 012-2h3l.6 8H12m7 4h-3m0 0v-3m3 0h-3m3 0v-3m3 0H21" />
              </svg>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white mb-3">
              Enterprise Account Provisioning
            </h1>
            <p className="text-indigo-100 dark:text-indigo-200 mb-8 text-center max-w-md">
              All AUDMA OS accounts are provisioned through your corporate<br />
              Identity Provider or by your system administrator.
            </p>

            <div className="space-y-4 w-full max-w-md">
              <div className="p-4 rounded-xl bg-indigo-50/20 border border-indigo-300/30">
                <h3 className="text-sm font-bold text-white mb-2">How to Get Access</h3>
                <ul className="text-indigo-100 text-sm space-y-2 list-disc list-inside">
                  <li>Log in via <strong>Google Workspace</strong> or <strong>Microsoft Entra ID</strong></li>
                  <li>Your account will be automatically provisioned on first login</li>
                  <li>Role-based permissions are mapped from your corporate directory groups</li>
                  <li>For new account requests, contact your system administrator or HR department</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Enterprise Notice */}
      <div className="flex lg:flex-1 lg:w-1/2 flex-col justify-center p-8 lg:p-0 bg-white dark:bg-slate-950">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Account Provisioning
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Public self-registration is not available for AUDMA OS.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-8">
            <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Accounts Are Enterprise-Provisioned
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              AUDMA OS follows enterprise identity standards. All user accounts are
              created and managed through your organization's central Identity Provider
              (IdP). There is no public sign-up form.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => window.location.href = '/api/auth/oidc/callback?provider=google'}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
              >
                <img src="https://fonts.gstatic.com/s/i/shortterm/googleg/svg/logo_id_googleg.svg" alt="Google" className="w-4 h-4" />
                Sign in with Google Workspace
              </button>
              <button
                onClick={() => window.location.href = '/api/auth/oidc/callback?provider=microsoft'}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.53 3.556c-.242-.01-.492-.01-.733-.01-.273 0-.543 0-.815.01-1.257.046-2.327.344-2.985.866-.648.516-1.035 1.365-1.035 2.262v.89c0 .173-.017.342-.027.511a4 4 0 01-.056.756c-.032.346-.075.635-.075.635s-.459.957-.459 1.715v.418c0 .74.135 1.314.41 1.728.29.43.718.776 1.193.945a6 6 0 001.186.212c.015 0 .032-.005.047-.005.488-.005.974-.019 1.452-.064l.055-.005.021-.006c1.073-.135 1.992-.523 2.536-1.137l.066-.074c.276-.314.48-.693.582-1.095l.006-.023c.027-.505.052-1.003.052-1.508v-.39c0-.217.014-.431.027-.646a4 4 0 01.056-.756c.01-.169.027-.338.027-.511v-.89c0-.897-.387-1.746-1.035-2.262-.658-.522-1.728-.82-2.985-.866-.273-.01-.542-.01-.815-.01-.241 0-.491 0-.733.01-1.077.038-1.992.278-2.597.69-.597.407-.965 1.079-.965 1.835v.886c0 .155-.015.307-.024.459a3 3 0 01-.045.608c-.021.223-.049.411-.049.411s-.319.656-.319 1.189v.298c0 .514.093.912.284 1.202.198.302.496.539.829.655a4 4 0 00.82.146c.01 0 .021-.003.031-.003.337-.003.671-.013 1.001-.044l.038-.003.015-.004c.74-.093 1.374-.361 1.749-.784l.045-.051c.19-.217.331-.478.401-.755l.004-.016c.019-.348.036-.692.036-1.04v-.27c0-.15.01-.298.019-.445a3 3 0 01.04-.522c.007-.117.019-.233.019-.351v-.612c0-.62-.268-1.207-.716-1.59-.448-.38-1.193-.567-2.061-.596-.188-.007-.373-.007-.561-.007-.166 0-.339 0-.506.007-.742.029-1.373.219-1.795.475-.416.254-.672.669-.672 1.127v.601c0 .103-.01.204-.016.306a2 2 0 01-.03.405c-.014.149-.033.275-.033.275s-.22.439-.22.827v.206c0 .352.064.625.194.825.136.207.341.369.57.452a3 3 0 00.564.1c.007 0 .014-.002.021-.002.225-.002.448-.009.668-.029l.025-.002.01-.003c.493-.063.917-.247 1.206-.528l.031-.035c.127-.145.22-.33.266-.519l.002-.01c.013-.239.025-.476.025-.715v-.186c0-.341-.018-.675-.05-1.005-.031-.328-.089-.653-.173-.975-.085-.322-.2-.64-.343-.952l-.01-.022a4 4 0 00-.515-.793c-.034-.045-.073-.087-.108-.132l-.046-.06c-.354-.461-.863-.845-1.49-1.103-.62-.255-1.325-.389-2.104-.389-.13 0-.255 0-.381.005-.758.032-1.402.196-1.936.428-.525.228-.849.59-.849 1.018v.54c0 .092-.009.182-.014.273a2 2 0 01-.027.361c-.012.133-.029.245-.029.245s-.196.392-.196.738v.184c0 .314.057.558.173.735.121.185.304.33.508.403a3 3 0 00.503.09c.006 0 .012-.002.019-.002.201-.002.4-.008.596-.026l.022-.002.009-.003c.44-.056.817-.22 1.077-.471l.028-.031c.113-.129.196-.294.237-.463l.002-.009c.012-.239.022-.424.022-.638v-.166c0-.304-.016-.602-.044-.897-.028-.293-.079-.583-.154-.87-.076-.287-.179-.571-.306-.849l-.009-.02a4 4 0 00-.46-.707c-.03-.04-.065-.078-.096-.118z" />
                </svg>
                Sign in with Microsoft Entra ID
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
              <p className="text-[11px] text-center text-slate-500 dark:text-slate-400">
                Need an account? Contact your system administrator.<br />
                Authentication managed by your corporate Identity Provider.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
