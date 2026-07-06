import React, { useState } from 'react';
import Button from '../common/Button';
import { useToast } from '../../contexts/ToastContext';
import * as adminApi from '../../api/adminApi';

export default function UserTable({ users, isFetching, userRoleFilter, setUserRoleFilter, userSearchTerm, setUserSearchTerm, onTopUpSuccess }) {
  const { showSuccess, showError } = useToast();
  const [topUpValues, setTopUpValues] = useState({});
  const [submittingUser, setSubmittingUser] = useState(null);

  const handleTopUpAmountChange = (userId, value) => {
    setTopUpValues(prev => ({
      ...prev,
      [userId]: value
    }));
  };

  const handleIndividualTopUp = async (userId) => {
    const amount = parseFloat(topUpValues[userId]);
    if (isNaN(amount) || amount <= 0) {
      showError('Please enter a valid positive amount.');
      return;
    }

    setSubmittingUser(userId);
    try {
      const response = await adminApi.topUpUser(userId, { amount });
      showSuccess(`Successfully added ${amount} tokens to user.`);
      setTopUpValues(prev => ({ ...prev, [userId]: '' }));
      if (onTopUpSuccess) {
        onTopUpSuccess();
      }
    } catch (err) {
      console.error('Individual top-up failed:', err);
      showError(err.response?.data?.message || 'Failed to top up user');
    } finally {
      setSubmittingUser(null);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.full_name || u.email || '').toLowerCase().includes(userSearchTerm.toLowerCase());
    const matchesRole = userRoleFilter === 'All' || (u.role && u.role.toLowerCase() === userRoleFilter.toLowerCase());
    return matchesSearch && matchesRole;
  });

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.02)',
      borderRadius: '12px',
      padding: '2rem',
      border: '1px solid rgba(255, 255, 255, 0.05)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontWeight: '500' }}>Registered Users</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            Manage users and perform inline token top-ups.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={userSearchTerm}
            onChange={(e) => setUserSearchTerm(e.target.value)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--color-text-primary)',
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              outline: 'none',
              width: '250px'
            }}
          />
          <select
            value={userRoleFilter}
            onChange={(e) => setUserRoleFilter(e.target.value)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--color-text-primary)',
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              outline: 'none'
            }}
          >
            <option value="All">All Roles</option>
            <option value="student">Students</option>
            <option value="professor">Professors</option>
            <option value="admin">Admins</option>
          </select>
        </div>
      </div>

      <div style={{
        overflowX: 'auto',
        background: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        {isFetching ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            Loading users...
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '500', color: 'var(--color-text-secondary)' }}>Name</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '500', color: 'var(--color-text-secondary)' }}>Email</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '500', color: 'var(--color-text-secondary)' }}>Role</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '500', color: 'var(--color-text-secondary)' }}>Tokens</th>
                <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '500', color: 'var(--color-text-secondary)' }}>Top-Up</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.02)' }}>
                    <td style={{ padding: '1rem' }}>{u.full_name || '-'}</td>
                    <td style={{ padding: '1rem', color: 'var(--color-text-secondary)' }}>{u.email}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.3rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        background: u.role === 'admin' ? 'rgba(231, 76, 60, 0.1)' : 
                                    u.role === 'professor' ? 'rgba(52, 152, 219, 0.1)' : 
                                    'rgba(46, 204, 113, 0.1)',
                        color: u.role === 'admin' ? '#e74c3c' : 
                               u.role === 'professor' ? '#3498db' : 
                               '#2ecc71',
                        fontWeight: '500'
                      }}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: '600' }}>{u.token_balance}</td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <input
                          type="number"
                          value={topUpValues[u.id] || ''}
                          onChange={(e) => handleTopUpAmountChange(u.id, e.target.value)}
                          placeholder="Amt"
                          min="1"
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'var(--color-text-primary)',
                            padding: '0.4rem 0.6rem',
                            borderRadius: '6px',
                            outline: 'none',
                            width: '70px',
                            fontSize: '0.85rem'
                          }}
                        />
                        <Button 
                          variant="secondary" 
                          onClick={() => handleIndividualTopUp(u.id)}
                          disabled={submittingUser === u.id || !topUpValues[u.id]}
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                        >
                          {submittingUser === u.id ? '...' : 'Add'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
