// TeacherDashboardStyles.js

export const styles = {
  container: { 
    padding: '40px 20px', 
    maxWidth: '800px', 
    margin: '0 auto', 
    fontFamily: 'system-ui, -apple-system, sans-serif', 
    color: '#1e293b',
    backgroundColor: '#ffffff', // Force white background to stop dark mode inversion
    minHeight: '100vh'          // Ensure it covers the whole screen
  },
  header: { fontSize: '28px', fontWeight: '800', marginBottom: '24px', color: '#0f172a' },
  tabContainer: { display: 'flex', gap: '12px', marginBottom: '32px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' },
  tab: (isActive) => ({
    padding: '10px 24px', border: 'none', borderRadius: '999px', fontSize: '15px', fontWeight: '600', cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: isActive ? '#4f46e5' : '#f1f5f9',
    color: isActive ? '#ffffff' : '#64748b',
    boxShadow: isActive ? '0 4px 6px -1px rgba(79, 70, 229, 0.2)' : 'none'
  }),
  card: { backgroundColor: '#ffffff', padding: '32px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)', border: '1px solid #f1f5f9' },
  cardTitle: { fontSize: '20px', fontWeight: '700', marginBottom: '24px', color: '#0f172a' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' },
  label: { fontSize: '14px', fontWeight: '600', color: '#475569' },
  input: { padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none', transition: 'border 0.2s', width: '100%', boxSizing: 'border-box' },
  fileZone: { border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '32px', textAlign: 'center', backgroundColor: '#f8fafc', cursor: 'pointer', transition: 'all 0.2s' },
  primaryBtn: (isDisabled) => ({
    padding: '14px 24px', backgroundColor: isDisabled ? '#94a3b8' : '#4f46e5', color: 'white', border: 'none', borderRadius: '8px',
    fontSize: '16px', fontWeight: '600', cursor: isDisabled ? 'not-allowed' : 'pointer', width: '100%', marginTop: '10px',
    transition: 'background-color 0.2s'
  }),
  message: (type) => ({
    marginTop: '20px', padding: '16px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px',
    backgroundColor: type === 'error' ? '#fef2f2' : type === 'success' ? '#f0fdf4' : '#eff6ff',
    color: type === 'error' ? '#991b1b' : type === 'success' ? '#166534' : '#1e40af',
    border: `1px solid ${type === 'error' ? '#fecaca' : type === 'success' ? '#bbf7d0' : '#bfdbfe'}`
  }),
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '24px', fontSize: '14px' },
  th: { textAlign: 'left', padding: '12px 16px', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '600' },
  td: { padding: '16px', borderBottom: '1px solid #f1f5f9', color: '#1e293b' },
  badge: (status) => ({
    padding: '6px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', display: 'inline-block',
    backgroundColor: status === 'error' ? '#fef2f2' : status === 'unregistered_needs_review' ? '#fffbeb' : '#f0fdf4',
    color: status === 'error' ? '#991b1b' : status === 'unregistered_needs_review' ? '#b45309' : '#166534',
    border: `1px solid ${status === 'error' ? '#fecaca' : status === 'unregistered_needs_review' ? '#fde68a' : '#bbf7d0'}`
  })
};