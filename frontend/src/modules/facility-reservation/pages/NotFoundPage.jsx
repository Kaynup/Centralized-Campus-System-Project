/**
 * NotFoundPage - 404 Error Page
 * Shown when user navigates to invalid route
 */

import { useNavigate } from 'react-router-dom'

function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      fontFamily: 'var(--font-sans)',
      color: 'var(--color-text-primary)',
      backgroundColor: 'var(--color-grid-bg)',
      padding: '2rem',
    }}>
      <h1 style={{ fontSize: '4rem', fontWeight: 'bold', margin: '0 0 1rem' }}>
        404
      </h1>
      <h2 style={{ fontSize: '1.5rem', margin: '0 0 1rem' }}>
        Page Not Found
      </h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <button
        onClick={() => navigate('/calendar')}
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: 'var(--color-available)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          fontWeight: '500',
          fontSize: '1rem',
        }}
      >
        ← Calendar
      </button>
    </div>
  )
}

export default NotFoundPage
