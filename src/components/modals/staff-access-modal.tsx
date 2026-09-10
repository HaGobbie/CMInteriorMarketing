import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Pencil, Plus, ShieldCheck, UserRound, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import {
  isSuperAdminRole,
  type StaffMember,
  type StaffProfile,
  type StaffRole,
} from '@/lib/auth';

type StaffAccessModalProps = {
  currentUser: StaffProfile;
  onClose: () => void;
};

type StaffMemberRow = {
  staff_access_id?: string | null;
  profile_id?: string | null;
  email?: string | null;
  full_name?: string | null;
  role?: string | null;
};

const asStaffMember = (row: StaffMemberRow): StaffMember | null => {
  const email = row.email?.trim().toLowerCase();
  if (!email || (row.role !== 'staff' && !isSuperAdminRole(row.role))) return null;
  const memberRole: StaffRole = row.role === 'super_admin' ? 'super_admin' : 'staff';

  return {
    id: row.profile_id ?? row.staff_access_id ?? email,
    profile_id: row.profile_id ?? null,
    staff_access_id: row.staff_access_id ?? null,
    email,
    full_name: row.full_name?.trim() || null,
    role: memberRole,
  };
};

export default function StaffAccessModal({ currentUser, onClose }: StaffAccessModalProps) {
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('staff');

  const currentEmail = currentUser.email.trim().toLowerCase();
  const editingSelf = editing?.email === currentEmail;
  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => a.email.localeCompare(b.email)),
    [members],
  );

  const loadMembers = async () => {
    setLoading(true);
    setError('');
    const { data, error: loadError } = await supabase.rpc('list_staff_members');
    if (loadError) {
      setError(`Could not load staff access: ${loadError.message}`);
      setLoading(false);
      return;
    }

    const nextMembers = ((data ?? []) as StaffMemberRow[])
      .map(asStaffMember)
      .filter((member): member is StaffMember => Boolean(member));
    setMembers(nextMembers);
    setLoading(false);
  };

  useEffect(() => {
    void loadMembers();
  }, []);

  const startAdding = () => {
    setEditing(null);
    setName('');
    setEmail('');
    setRole('staff');
    setError('');
  };

  const startEditing = (member: StaffMember) => {
    setEditing(member);
    setName(member.full_name ?? '');
    setEmail(member.email);
    setRole(member.role);
    setError('');
  };

  const saveMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();
    if (!normalizedName || !normalizedEmail) {
      setError('Enter the staff member’s name and email.');
      return;
    }
    if (editingSelf && normalizedEmail !== currentEmail) {
      setError('You cannot change the email of the signed-in super admin here.');
      return;
    }

    setSaving(true);
    setError('');
    const { error: saveError } = await supabase.rpc('manage_staff_member', {
      target_staff_access_id: editing?.staff_access_id ?? null,
      target_email: normalizedEmail,
      target_full_name: normalizedName,
      target_role: role,
    });

    if (saveError) {
      setError(saveError.message);
      setSaving(false);
      return;
    }

    await loadMembers();
    setSaving(false);
    startAdding();
  };

  return (
    <div
      className="overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-access-title"
        style={{ width: 'min(100%, 820px)' }}
      >
        <div className="modal-head">
          <div>
            <div className="eyebrow">Super admin controls</div>
            <h2 id="staff-access-title">Manage staff access</h2>
          </div>
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Close staff access manager"
            data-testid="button-close-staff-manager"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.2fr) minmax(260px, .8fr)',
              gap: 22,
              alignItems: 'start',
            }}
          >
            <section>
              <div className="panel-head" style={{ marginBottom: 10 }}>
                <div>
                  <h3 style={{ margin: 0, font: '600 20px var(--app-font-serif)' }}>
                    Registered staff
                  </h3>
                  <p style={{ margin: '5px 0 0', color: 'var(--muted-ink)', fontSize: 11 }}>
                    Only super admins can edit these access records.
                  </p>
                </div>
                <button onClick={startAdding} data-testid="button-add-staff">
                  <Plus size={13} /> Add staff
                </button>
              </div>

              {loading ? (
                <div className="empty-state">Loading staff access…</div>
              ) : sortedMembers.length === 0 ? (
                <div className="empty-state">No staff access records yet.</div>
              ) : (
                <div style={{ display: 'grid', gap: 9 }}>
                  {sortedMembers.map((member) => {
                    const isSelf = member.email === currentEmail;
                    return (
                      <article
                        key={`${member.staff_access_id ?? member.profile_id ?? member.email}`}
                        style={{
                          border: '1px solid var(--sand)',
                          padding: '11px 12px',
                          background: '#faf8f5',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            gap: 12,
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ minWidth: 0, display: 'flex', gap: 9, alignItems: 'center' }}>
                            {member.role === 'super_admin' ? (
                              <ShieldCheck size={16} color="var(--crimson)" />
                            ) : (
                              <UserRound size={16} color="var(--sage)" />
                            )}
                            <div style={{ minWidth: 0 }}>
                              <strong style={{ display: 'block', fontSize: 12 }}>
                                {member.full_name || 'Unnamed staff'}{isSelf ? ' · You' : ''}
                              </strong>
                              <span
                                style={{
                                  display: 'block',
                                  marginTop: 3,
                                  color: 'var(--muted-ink)',
                                  fontSize: 10,
                                  overflowWrap: 'anywhere',
                                }}
                              >
                                {member.email}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 9, alignItems: 'center', flexShrink: 0 }}>
                            <span className="status-chip">
                              {member.role === 'super_admin' ? 'Super admin' : 'Staff'}
                            </span>
                            <button
                              className="table-action"
                              onClick={() => startEditing(member)}
                              data-testid={`button-edit-staff-${member.email}`}
                            >
                              <Pencil size={12} /> Edit
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section style={{ background: '#f1eee9', padding: 15 }}>
              <div className="eyebrow">{editing ? 'Update access' : 'New access'}</div>
              <h3 style={{ margin: '8px 0 15px', font: '600 21px var(--app-font-serif)' }}>
                {editing ? 'Edit staff member' : 'Add staff member'}
              </h3>
              <form onSubmit={saveMember}>
                <div className="light-field">
                  <label htmlFor="staff-access-name">Name</label>
                  <input
                    id="staff-access-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Full name"
                    disabled={saving}
                    data-testid="input-staff-access-name"
                  />
                </div>
                <div className="light-field">
                  <label htmlFor="staff-access-email">Email</label>
                  <input
                    id="staff-access-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@company.com"
                    disabled={saving || editingSelf}
                    data-testid="input-staff-access-email"
                  />
                </div>
                <div className="light-field">
                  <label htmlFor="staff-access-role">Portal role</label>
                  <select
                    id="staff-access-role"
                    value={role}
                    onChange={(event) => setRole(event.target.value as StaffRole)}
                    disabled={saving || editingSelf}
                    style={{ width: '100%', border: '1px solid var(--sand)', background: 'white', padding: 12, outline: 'none', fontSize: 13 }}
                    data-testid="select-staff-access-role"
                  >
                    <option value="staff">Normal staff</option>
                    <option value="super_admin">Super admin</option>
                  </select>
                </div>
                {editingSelf && (
                  <p style={{ color: 'var(--muted-ink)', fontSize: 10, lineHeight: 1.5, margin: '-3px 0 13px' }}>
                    Your own super-admin role and email are protected so you cannot lock yourself out of the portal.
                  </p>
                )}
                {error && <div className="login-error" role="alert">{error}</div>}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  {editing && (
                    <button type="button" className="text-button" onClick={startAdding} disabled={saving}>
                      Cancel
                    </button>
                  )}
                  <button className="primary-button" type="submit" disabled={saving} data-testid="button-save-staff-access">
                    {saving ? 'Saving…' : editing ? 'Save changes' : 'Add staff'}
                  </button>
                </div>
              </form>
            </section>
          </div>
          <p style={{ color: 'var(--muted-ink)', fontSize: 10, lineHeight: 1.5, margin: '18px 0 0' }}>
            A registered email can sign in with Supabase Auth and will receive the selected portal role. If the auth account does not exist yet, the access record is kept and applied when that email is registered.
          </p>
        </div>
      </div>
    </div>
  );
}
