// TeacherDashboardStyles.js

export const styles = {
  // The root wrapper. `colorScheme: 'light'` is the key fix here — it tells
  // browsers (and most dark-mode extensions) that this page is intentionally
  // light, so they stop trying to invert backgrounds, borders, and form fields.
  container: {
    padding: '40px 20px',
    maxWidth: '800px',
    margin: '0 auto',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, "Helvetica Neue", Arial, sans-serif',
    color: '#1e293b',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
    colorScheme: 'light',
  },

  header: {
    fontSize: '28px',
    fontWeight: '800',
    letterSpacing: '-0.02em',
    marginBottom: '4px',
    color: '#0f172a',
  },

  subheader: {
    fontSize: '15px',
    color: '#64748b',
    marginBottom: '28px',
    fontWeight: '500',
  },

  tabContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '28px',
    backgroundColor: '#eef2ff',
    padding: '6px',
    borderRadius: '14px',
    width: 'fit-content',
  },

  tab: (isActive) => ({
    padding: '10px 22px',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: isActive ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'transparent',
    color: isActive ? '#ffffff' : '#4338ca',
    boxShadow: isActive ? '0 4px 12px -2px rgba(79, 70, 229, 0.4)' : 'none',
  }),

  card: {
    backgroundColor: '#ffffff',
    color: '#1e293b',
    padding: '32px',
    borderRadius: '16px',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 28px -10px rgba(15, 23, 42, 0.12)',
    border: '1px solid #f1f5f9',
    borderTop: '4px solid #4f46e5',
    colorScheme: 'light',
  },

  cardTitle: {
    fontSize: '19px',
    fontWeight: '700',
    marginBottom: '24px',
    color: '#0f172a',
    letterSpacing: '-0.01em',
  },

  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '20px',
  },

  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },

  input: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1.5px solid #cbd5e1',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    colorScheme: 'light',
  },

  fileZone: {
    border: '2px dashed #c7d2fe',
    borderRadius: '12px',
    padding: '32px',
    textAlign: 'center',
    backgroundColor: '#f5f5ff',
    cursor: 'pointer',
    transition: 'all 0.2s',
    color: '#1e293b',
  },

  primaryBtn: (isDisabled) => ({
    padding: '14px 24px',
    background: isDisabled ? '#94a3b8' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '700',
    letterSpacing: '0.01em',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    width: '100%',
    marginTop: '10px',
    boxShadow: isDisabled ? 'none' : '0 6px 16px -4px rgba(79, 70, 229, 0.5)',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  }),

  message: (type) => ({
    marginTop: '20px',
    padding: '14px 16px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: type === 'error' ? '#fef2f2' : type === 'success' ? '#f0fdf4' : '#eff6ff',
    color: type === 'error' ? '#991b1b' : type === 'success' ? '#166534' : '#1e40af',
    border: `1px solid ${type === 'error' ? '#fecaca' : type === 'success' ? '#bbf7d0' : '#bfdbfe'}`,
  }),

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '24px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    color: '#1e293b',
    borderRadius: '10px',
    overflow: 'hidden',
  },

  th: {
    textAlign: 'left',
    padding: '12px 16px',
    backgroundColor: '#f8fafc',
    borderBottom: '2px solid #e2e8f0',
    color: '#475569',
    fontWeight: '600',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },

  td: {
    padding: '16px',
    borderBottom: '1px solid #f1f5f9',
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },

  badge: (status) => ({
    padding: '6px 12px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block',
    backgroundColor: status === 'error' ? '#fef2f2' : status === 'unregistered_needs_review' ? '#fffbeb' : '#f0fdf4',
    color: status === 'error' ? '#991b1b' : status === 'unregistered_needs_review' ? '#b45309' : '#166534',
    border: `1px solid ${status === 'error' ? '#fecaca' : status === 'unregistered_needs_review' ? '#fde68a' : '#bbf7d0'}`,
  }),
};