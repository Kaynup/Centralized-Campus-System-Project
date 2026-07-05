const TONES = {
  success: 'bg-green-100 text-green-700',
  danger: 'bg-red-100 text-red-700',
  warning: 'bg-yellow-100 text-yellow-700',
  info: 'bg-blue-100 text-blue-700',
  gold: 'bg-gold/15 text-gold',
  default: 'bg-slate/10 text-slate',
};

export default function StatusBadge({ status, tone = 'default' }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone] || TONES.default}`}>
      {status}
    </span>
  );
}