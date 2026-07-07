import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useToast } from '../ui/Toast'; 
import { useWallet } from '../hooks/useWallet';
import { convertUsdToTokens } from './walletUtils';
import { USD_TO_TOKEN_RATE } from './constants';

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
    <Modal isOpen={isOpen} onClose={onClose} title="Top Up Tokens">
      <label className="text-sm font-medium text-slate">Amount</label>
      <input
        type="number"
        min="1"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="mt-1 w-full rounded-md border border-slate/20 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-forest"
        placeholder="Enter amount"
        disabled={submitting}
      />
      
      {amount && !isNaN(Number(amount)) && Number(amount) > 0 && (
        <p className="mt-1 text-sm text-slate/60">
          ≈ {convertUsdToTokens(amount, USD_TO_TOKEN_RATE)} tokens (rate: 1 USD = {USD_TO_TOKEN_RATE} tokens)
        </p>
      )}
      
      {validationError && <p className="mt-1 text-sm text-red-600">{validationError}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button onClick={handleSubmit} loading={submitting}>Confirm Top-up</Button>
      </div>
    </Modal>
  );
}