import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useToast } from '../ui/Toast'; 
import { useWallet } from '../hooks/useWallet';

export default function TopUpModal({ isOpen, onClose }) {
  const { topUp } = useWallet();
  const { showToast } = useToast();
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState(null);

  const validate = (value) => {
    const num = Number(value);
    if (!value) return 'Amount is required.';
    if (Number.isNaN(num) || num <= 0) return 'Enter a valid positive amount.';
    if (num > 100000) return 'Amount exceeds maximum allowed top-up.';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate(amount);
    if (err) return setValidationError(err);
    setValidationError(null);
    setSubmitting(true);
    try {
      await topUp({ amount: Number(amount) }); // context refreshes wallet + transactions
      showToast({ type: 'success', message: 'Top-up successful.' });
      setAmount('');
      onClose();
    } catch (e) {
      showToast({ type: 'error', message: e.message || 'Top-up failed. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Top Up Wallet">
      <label className="text-sm font-medium text-slate">Amount (Rupees / ₹)</label>
      <input
        type="number"
        min="1"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="mt-1 w-full rounded-md border border-slate/20 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-forest"
        placeholder="Enter amount in ₹"
        disabled={submitting}
      />
      {amount && !validationError && (
        <p className="mt-2 text-sm text-forest font-medium">
          You will receive: {(Number(amount) / 10).toFixed(2)} tokens
        </p>
      )}
      {validationError && <p className="mt-1 text-sm text-red-600">{validationError}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button onClick={handleSubmit} loading={submitting}>Confirm Payment</Button>
      </div>
    </Modal>
  );
}