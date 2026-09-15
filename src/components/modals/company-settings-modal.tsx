import { useEffect, useState } from 'react';
import { CheckCircle2, Plus, Trash2, X } from 'lucide-react';
import {
  fetchCompanySettings,
  saveCompanySettings,
  type CompanySettings,
} from '@/lib/companySettings';

type CompanySettingsModalProps = {
  onClose: () => void;
  onSaved?: (settings: CompanySettings) => void;
};

const inputStyle = {
  width: '100%',
  border: '1px solid var(--sand)',
  background: 'white',
  color: 'var(--obsidian)',
  padding: '10px 11px',
  fontSize: 12,
  marginTop: 6,
};

export default function CompanySettingsModal({ onClose, onSaved }: CompanySettingsModalProps) {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<CompanySettings>({
    address: '',
    telNo: '',
    mobileNo: '',
    email: '',
    terms: [''],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let mounted = true;
    void fetchCompanySettings().then((loaded) => {
      if (!mounted) return;
      setSettings({ ...loaded, terms: loaded.terms.length ? loaded.terms : [''] });
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const updateTerm = (index: number, value: string) => {
    setSettings((current) => ({
      ...current,
      terms: current.terms.map((term, termIndex) => (termIndex === index ? value : term)),
    }));
  };

  const removeTerm = (index: number) => {
    setSettings((current) => ({
      ...current,
      terms: current.terms.length === 1 ? current.terms : current.terms.filter((_, termIndex) => termIndex !== index),
    }));
  };

  const save = async () => {
    setSaving(true);
    setError('');
    const cleaned: CompanySettings = {
      ...settings,
      terms: settings.terms.map((term) => term.trim()).filter(Boolean),
    };
    const result = await saveCompanySettings(cleaned);
    setSaving(false);
    if (result.error) {
      setError(
        `Could not save: ${result.error}. If this is the first time saving, make sure the company_settings table has been created — see the comment at the top of src/lib/companySettings.ts.`,
      );
      return;
    }
    setSaved(true);
    onSaved?.(cleaned);
    window.setTimeout(() => setSaved(false), 2200);
  };

  return (
    <div
      className="overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="company-settings-title"
        style={{ width: 'min(100%, 620px)' }}
      >
        <div className="modal-head">
          <div>
            <div
              style={{
                color: 'var(--crimson)',
                fontSize: 10,
                letterSpacing: '.12em',
                textTransform: 'uppercase',
                fontWeight: 700,
                marginBottom: 5,
              }}
            >
              Letterhead &amp; terms
            </div>
            <h2 id="company-settings-title">Edit quotation details</h2>
          </div>
          <button
            className="close-button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close letterhead editor"
            data-testid="button-close-company-settings"
          >
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="empty-state">Loading current settings…</div>
          ) : (
            <>
              <p style={{ margin: '0 0 20px', color: 'var(--muted-ink)', fontSize: 12, lineHeight: 1.6 }}>
                This address, phone numbers, email, and terms appear on every
                exported and printed quotation. Update them here whenever any
                of it changes — no code change needed.
              </p>

              <label
                style={{
                  display: 'block',
                  color: 'var(--muted-ink)',
                  fontSize: 10,
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                }}
              >
                Office address
                <input
                  value={settings.address}
                  onChange={(event) => setSettings((current) => ({ ...current, address: event.target.value }))}
                  style={inputStyle}
                  data-testid="input-company-address"
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginTop: 14 }}>
                <label
                  style={{
                    color: 'var(--muted-ink)',
                    fontSize: 10,
                    letterSpacing: '.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  Telephone number
                  <input
                    value={settings.telNo}
                    onChange={(event) => setSettings((current) => ({ ...current, telNo: event.target.value }))}
                    style={inputStyle}
                    data-testid="input-company-tel"
                  />
                </label>
                <label
                  style={{
                    color: 'var(--muted-ink)',
                    fontSize: 10,
                    letterSpacing: '.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  Mobile number
                  <input
                    value={settings.mobileNo}
                    onChange={(event) => setSettings((current) => ({ ...current, mobileNo: event.target.value }))}
                    style={inputStyle}
                    data-testid="input-company-mobile"
                  />
                </label>
              </div>

              <label
                style={{
                  display: 'block',
                  color: 'var(--muted-ink)',
                  fontSize: 10,
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                  marginTop: 14,
                }}
              >
                Email
                <input
                  type="email"
                  value={settings.email}
                  onChange={(event) => setSettings((current) => ({ ...current, email: event.target.value }))}
                  style={inputStyle}
                  data-testid="input-company-email"
                />
              </label>

              <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid var(--sand)' }}>
                <div className="eyebrow">Terms and conditions</div>
                <p style={{ margin: '8px 0 12px', color: 'var(--muted-ink)', fontSize: 11, lineHeight: 1.6 }}>
                  Each line below becomes one numbered clause on the quotation.
                </p>
                <div style={{ display: 'grid', gap: 8 }}>
                  {settings.terms.map((term, index) => (
                    <div key={index} style={{ display: 'flex', gap: 8, alignItems: 'start' }}>
                      <span style={{ color: 'var(--muted-ink)', fontSize: 11, paddingTop: 10, minWidth: 16 }}>
                        {index + 1}.
                      </span>
                      <textarea
                        value={term}
                        onChange={(event) => updateTerm(index, event.target.value)}
                        rows={2}
                        style={{ ...inputStyle, marginTop: 0, resize: 'vertical', flex: 1 }}
                        data-testid={`textarea-company-term-${index}`}
                      />
                      <button
                        type="button"
                        className="table-action"
                        onClick={() => removeTerm(index)}
                        disabled={settings.terms.length === 1}
                        aria-label={`Remove clause ${index + 1}`}
                        style={{ opacity: settings.terms.length === 1 ? 0.35 : 1, marginTop: 6 }}
                        data-testid={`button-remove-company-term-${index}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setSettings((current) => ({ ...current, terms: [...current.terms, ''] }))}
                  style={{ marginTop: 10 }}
                  data-testid="button-add-company-term"
                >
                  <Plus size={13} /> Add another clause
                </button>
              </div>

              {error && (
                <div
                  role="alert"
                  style={{ color: 'var(--crimson)', background: '#fbeceb', padding: '10px 12px', marginTop: 18, fontSize: 11, lineHeight: 1.5 }}
                >
                  {error}
                </div>
              )}
              {saved && (
                <div
                  role="status"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--sage)', background: '#e5ebe7', padding: '10px 12px', marginTop: 18, fontSize: 11 }}
                >
                  <CheckCircle2 size={14} /> Saved. New quotations will use these details.
                </div>
              )}

              <div className="quote-actions" style={{ marginTop: 22 }}>
                <button type="button" className="text-button" onClick={onClose} disabled={saving}>
                  Close
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void save()}
                  disabled={saving}
                  data-testid="button-save-company-settings"
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
