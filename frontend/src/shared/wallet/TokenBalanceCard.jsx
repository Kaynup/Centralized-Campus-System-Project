import Card from '../ui/Card';
import Loader from '../ui/Loader';
import { formatTokens, computeAvailable } from './walletUtils';

export default function TokenBalanceCard({ wallet, loading }) {
  if (loading) return <Card><Loader label="Loading balance..." /></Card>;
  const available = computeAvailable(wallet);

  return (
    <Card className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Stat label="Token Balance" value={formatTokens(wallet?.token_balance)} tone="text-forest" />
      <Stat label="Reserved Tokens" value={formatTokens(wallet?.reserved_tokens)} tone="text-gold" />
      <Stat label="Available Tokens" value={formatTokens(available)} tone="text-slate" emphasis />
    </Card>
  );
}

function Stat({ label, value, tone, emphasis }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate/60">{label}</p>
      <p className={`mt-1 ${emphasis ? 'text-2xl font-bold' : 'text-xl font-semibold'} ${tone}`}>{value}</p>
    </div>
  );
}