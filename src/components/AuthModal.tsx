import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';
import { CareerPilotLogo } from './CareerPilotLogo';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  open: boolean;
  mode: 'login' | 'signup';
  onClose: () => void;
  onModeChange: (mode: 'login' | 'signup') => void;
}

export function AuthModal({ open, mode, onClose, onModeChange }: AuthModalProps) {
  const { signInWithGoogle, authError, clearAuthError } = useAuth();
  const [submitting, setSubmitting] = React.useState(false);

  const handleGoogleAuth = async () => {
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#101828]/65 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <CareerPilotLogo size="sm" />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close sign in dialog"
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              <h2 id="auth-modal-title" className="font-display text-2xl font-bold text-[#101828]">
                {mode === 'signup' ? 'Start your CHADHUVUKO workspace' : 'Welcome back to CHADHUVUKO'}
              </h2>
              <p className="mt-2 text-sm text-[#64748B] leading-relaxed">
                {mode === 'signup'
                  ? 'Create your private workspace to analyze resumes, evaluate role fit, practice interviews, and track every application.'
                  : 'Sign in with your Google account to access your saved resumes, AI analyses, roadmaps, and applications.'}
              </p>

              {authError && (
                <div className="mt-4 flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <div className="flex-1">
                    <p>{authError}</p>
                    <button
                      type="button"
                      onClick={clearAuthError}
                      className="mt-1 text-xs font-medium underline text-rose-700 cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                disabled={submitting}
                onClick={handleGoogleAuth}
                className="mt-6 w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#101828] hover:bg-[#142033] disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.86-3c-.98.66-2.23 1.06-3.42 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                </svg>
                <span>
                  {submitting
                    ? 'Connecting to Google...'
                    : mode === 'signup'
                      ? 'Continue with Google'
                      : 'Sign in with Google'}
                </span>
                <ArrowRight className="w-4 h-4 opacity-75" />
              </button>

              <div className="mt-5 pt-5 border-t border-slate-100 flex items-start gap-2.5 text-xs text-[#64748B]">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p>
                  Authenticated sessions verify your identity on the server before reading or saving
                  private resumes, interview transcripts, and applications.
                </p>
              </div>

              <div className="mt-5 text-center text-xs text-[#64748B]">
                {mode === 'signup' ? (
                  <>
                    Already have a workspace?{' '}
                    <button
                      type="button"
                      onClick={() => onModeChange('login')}
                      className="font-semibold text-[#101828] hover:underline cursor-pointer"
                    >
                      Sign in
                    </button>
                  </>
                ) : (
                  <>
                    New to CHADHUVUKO?{' '}
                    <button
                      type="button"
                      onClick={() => onModeChange('signup')}
                      className="font-semibold text-[#101828] hover:underline cursor-pointer"
                    >
                      Create an account
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
