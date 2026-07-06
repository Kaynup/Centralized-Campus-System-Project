import React from 'react';
import Button from '../common/Button';

export default function CSVUploader({
  file,
  handleFileChange,
  handleUpload,
  isLoading,
  previewData,
  roleFilter,
  setRoleFilter,
  results
}) {
  const filteredPreview = roleFilter === 'All'
    ? previewData
    : previewData.filter(u => u.role && u.role.toLowerCase() === roleFilter.toLowerCase());

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.02)',
      borderRadius: '12px',
      padding: '2rem',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      height: '100%',
      boxSizing: 'border-box'
    }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontWeight: '500' }}>Upload Users CSV</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          Format: <code>full_name, email, role</code> (role: student, professor, admin)
        </p>
      </div>
      
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block' }}>
          <Button variant="secondary">Choose File</Button>
          <input
            id="csv-upload-input"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              opacity: 0,
              width: '100%',
              height: '100%',
              cursor: 'pointer'
            }}
          />
        </div>
        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          {file ? file.name : 'No file chosen'}
        </span>
      </div>

      <Button
        variant="primary"
        onClick={handleUpload}
        disabled={!file || isLoading}
      >
        {isLoading ? 'Uploading...' : 'Upload & Create Users'}
      </Button>

      {results && (
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{
            padding: '1rem',
            background: 'rgba(46, 204, 113, 0.1)',
            border: '1px solid rgba(46, 204, 113, 0.2)',
            borderRadius: '8px',
            color: '#2ecc71',
            marginBottom: results.errors && results.errors.length > 0 ? '1rem' : '0'
          }}>
            Created {results.created_count} users. Skipped {results.skipped_count}.
          </div>
          {results.errors && results.errors.length > 0 && (
            <div style={{
              padding: '1rem',
              background: 'rgba(231, 76, 60, 0.1)',
              border: '1px solid rgba(231, 76, 60, 0.2)',
              borderRadius: '8px',
              color: '#e74c3c'
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>Errors ({results.errors.length}):</h4>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.85rem' }}>
                {results.errors.slice(0, 10).map((err, i) => (
                  <li key={i} style={{ marginBottom: '0.2rem' }}>{err}</li>
                ))}
                {results.errors.length > 10 && (
                  <li style={{ fontStyle: 'italic', marginTop: '0.5rem' }}>...and {results.errors.length - 10} more.</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Preview Section */}
      {previewData && previewData.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '500' }}>Preview Data ({previewData.length} records)</h3>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--color-text-primary)',
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="All">All Roles</option>
              <option value="student">Students</option>
              <option value="professor">Professors</option>
              <option value="admin">Admins</option>
            </select>
          </div>
          
          <div style={{
            overflowX: 'auto',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <th style={{ padding: '0.8rem 1rem', textAlign: 'left', fontWeight: '500', color: 'var(--color-text-secondary)' }}>Full Name</th>
                  <th style={{ padding: '0.8rem 1rem', textAlign: 'left', fontWeight: '500', color: 'var(--color-text-secondary)' }}>Email</th>
                  <th style={{ padding: '0.8rem 1rem', textAlign: 'left', fontWeight: '500', color: 'var(--color-text-secondary)' }}>Role</th>
                </tr>
              </thead>
              <tbody>
                {filteredPreview.slice(0, 10).map((row, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.02)' }}>
                    <td style={{ padding: '0.8rem 1rem' }}>{row.full_name || '-'}</td>
                    <td style={{ padding: '0.8rem 1rem' }}>{row.email || '-'}</td>
                    <td style={{ padding: '0.8rem 1rem' }}>
                      <span style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        background: 'rgba(255, 255, 255, 0.1)'
                      }}>
                        {row.role || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredPreview.length > 10 && (
              <div style={{ padding: '0.8rem', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                Showing first 10 of {filteredPreview.length} matching rows...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
