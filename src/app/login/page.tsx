import { redirect } from 'next/navigation';
import { isAuthDisabled } from '@/lib/auth-config';

export default function LoginPage() {
  if (isAuthDisabled()) {
    redirect('/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFBFC] px-4">
      <div className="w-full max-w-md bg-white border border-[#E2E8F0] p-8 shadow-sm text-center">
        <h1 className="text-xl font-semibold text-[#1A202C]">Sign in</h1>
        <p className="text-sm text-[#718096] mt-2">
          Auth is enabled. Set <code className="text-xs">DISABLE_AUTH=true</code> in .env.local for local dev.
        </p>
      </div>
    </div>
  );
}
