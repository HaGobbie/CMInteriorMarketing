import { useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { signInWithGoogle, signInWithEmail } from '@/lib/auth';

type LoginModalProps = {
  onClose: () => void;
  onSuccess: () => void;
};

const DEMO_EMAIL = 'staff@cminteriors.ph';
const DEMO_PASSWORD = 'showroom2024';

export default function LoginModal({ onClose, onSuccess }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      // Fallback/direct check for the demo credentials or real Supabase auth
      if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
        try {
          await signInWithEmail(email, password);
        } catch {
          // Allow demo bypass if account isn't seeded in Supabase yet
        }
        onSuccess();
        onClose();
        return;
      }

      await signInWithEmail(email, password);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(
        err?.message || 'Use the showroom demo access: staff@cminteriors.ph · showroom2024',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message || 'Google sign-in failed.');
    }
  };

  const autofillDemoCredentials = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setError('');
  };

  return (
    <div
      className="overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal login-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
      >
        <div className="login-art">
          <button
            className="close-button"
            style={{
              position: 'absolute',
              right: 18,
              top: 15,
              color: 'white',
              zIndex: 2,
            }}
            onClick={onClose}
            aria-label="Close login"
            data-testid="button-close-login"
          >
            <X size={18} />
          </button>
          <h2 id="login-title">Staff portal & Sign in</h2>
        </div>
        <div style={{ padding: '24px' }}>
          <p
            style={{
              margin: '0 0 16px',
              color: 'var(--muted-ink)',
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            Sign in securely with Google or use staff credentials for the working desk.
          </p>

          {/* Google OAuth Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="primary-button"
            style={{
              width: '100%',
              backgroundColor: 'white',
              color: '#1e293b',
              border: '1px solid #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '14px',
              fontWeight: 500,
            }}
            data-testid="button-google-login"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" style={{ width: 16, height: 16 }} />
            Sign in with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', margin: '12px 0' }}>
            <div style={{ flexGrow: 1, borderTop: '1px solid #e2e8f0' }}></div>
            <span style={{ padding: '0 8px', fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>or staff email</span>
            <div style={{ flexGrow: 1, borderTop: '1px solid #e2e8f0' }}></div>
          </div>

          <form
            className="login-form"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <div className="light-field">
              <label htmlFor="staff-email">Email</label>
              <input
                id="staff-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={DEMO_EMAIL}
                data-testid="input-staff-email"
                disabled={loading}
              />
            </div>
            <div className="light-field">
              <label htmlFor="staff-password">Password</label>
              <input
                id="staff-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') submit();
                }}
                data-testid="input-staff-password"
                disabled={loading}
              />
            </div>
            {error && (
              <div className="login-error" data-testid="status-login-error">
                {error}
              </div>
            )}
            <button
              className="text-button"
              type="button"
              onClick={autofillDemoCredentials}
              data-testid="button-autofill-demo-credentials"
              style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}
              disabled={loading}
            >
              Auto-fill demo credentials
            </button>
            <button
              className="primary-button"
              type="submit"
              data-testid="button-login-staff"
              disabled={loading}
            >
              <ShieldCheck size={14} /> {loading ? 'Signing in...' : 'Sign in to desk'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}