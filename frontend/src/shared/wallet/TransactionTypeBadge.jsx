import StatusBadge from '../ui/StatusBadge';
import { TRANSACTION_TYPE_META } from './constants';

export default function TransactionTypeBadge({ type }) {
  const meta = TRANSACTION_TYPE_META[type] ?? { label: type, tone: 'default', sign: '' };
  return <StatusBadge status={meta.label} tone={meta.tone} />;
}