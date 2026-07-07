// Temporary frontend-side limits until backend exposes them (see §13)
// Top-up conversion rate (mirrors backend USD_TO_TOKEN_RATE) — used only in TopUpModal preview
export const USD_TO_TOKEN_RATE = Number(import.meta.env.VITE_USD_TO_TOKEN_RATE) || 10.0;
export const MAX_FACILITY_LIMIT = Number(import.meta.env.VITE_MAX_FACILITY_TOKEN_LIMIT) || 1000;
export const MAX_RENTAL_LIMIT = Number(import.meta.env.VITE_MAX_RENTAL_TOKEN_LIMIT) || 1000;

export const TRANSACTION_TYPE_META = {
  token_topup:        { label: 'Top-up',                 tone: 'success', sign: '+' },
  token_deduct:        { label: 'Token Deduction',        tone: 'danger',  sign: '-' },
  purchase:            { label: 'Marketplace Purchase',   tone: 'danger',  sign: '-' },
  refund:              { label: 'Refund',                 tone: 'success', sign: '+' },
  release:             { label: 'Escrow Release',          tone: 'info',    sign: '+' },
  deposit_lock:        { label: 'Deposit Locked',          tone: 'warning', sign: '-' },
  deposit_unlock:      { label: 'Deposit Refunded',        tone: 'success', sign: '+' },
  late_fee_deduction:  { label: 'Late Fee',                tone: 'danger',  sign: '-' },
};

// Reference-type → human label, for grouping Facility/Equipment/Marketplace rows
export const REFERENCE_TYPE_LABEL = {
  booking: 'Facility',
  rental: 'Equipment',
  holding_record: 'Marketplace',
  manual_adjustment: 'Admin',
};