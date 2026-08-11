import { useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';

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

  const submit = () => {
    if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
      onSuccess();
    } else {
      setError(
        'Use the showroom demo access: staff@cminteriors.ph · showroom2024',
      );
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
          <h2 id="login-title">Staff portal</h2>
        </div>
        <div className="login-form">
          <p
            style={{
              margin: '0 0 22px',
              color: 'var(--muted-ink)',
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            The working desk for catalog, sourcing, and fulfillment.
          </p>
          <div className="light-field">
            <label htmlFor="staff-email">Email</label>
            <input
              id="staff-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={DEMO_EMAIL}
              data-testid="input-staff-email"
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
            />
          </div>
          {error && (
            <div className="login-error" data-testid="status-login-error">
              {error}
            </div>
          )}
          <button
            className="text-button"
            onClick={autofillDemoCredentials}
            data-testid="button-autofill-demo-credentials"
            style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}
          >
            Auto-fill demo credentials
          </button>
          <button
            className="primary-button"
            onClick={submit}
            data-testid="button-login-staff"
          >
            <ShieldCheck size={14} /> Sign in to desk
          </button>
        </div>
      </div>
    </div>
  );
}
