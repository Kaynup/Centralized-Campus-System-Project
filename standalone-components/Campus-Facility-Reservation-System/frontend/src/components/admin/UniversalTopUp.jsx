import React, { useState } from 'react';
import Button from '../common/Button';
import { useToast } from '../../contexts/ToastContext';
import * as adminApi from '../../api/adminApi';

export default function UniversalTopUp({ onTopUpSuccess }) {
  const [targetGroup, setTargetGroup] = useState('ALL'); // ALL, STUDENTS, PROFESSORS
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleTopUp = async () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showError('Please enter a valid positive amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await adminApi.universalTopUp({ target_group: targetGroup, amount: parsedAmount });
      showSuccess(`Successfully topped up ${response.users_affected} users with ${parsedAmount} tokens.`);
      setAmount('');
      if (onTopUpSuccess) {
        onTopUpSuccess();
      }
    } catch (err) {
      console.error('Universal top-up failed:', err);
      showError(err.response?.data?.message || 'Universal top-up failed');
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontWeight: '500' }}>Universal Top-Up</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          Instantly add tokens to multiple users at once.
        </p>
      </div>
      
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Target Group</label>
          <select
            value={targetGroup}
            onChange={(e) => setTargetGroup(e.target.value)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--color-text-primary)',
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              outline: 'none',
              minWidth: '200px'
            }}
          >
            <option value="ALL">Everyone</option>
            <option value="STUDENTS">All Students</option>
            <option value="PROFESSORS">All Professors</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Amount (Tokens)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 50"
            min="1"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--color-text-primary)',
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              outline: 'none',
              width: '120px'
            }}
          />
        </div>

        <Button
          variant="primary"
          onClick={handleTopUp}
          disabled={isSubmitting || !amount}
          style={{ height: '42px' }}
        >
          {isSubmitting ? 'Processing...' : 'Apply Top-Up'}
        </Button>
      </div>
    </div>
  );
}
