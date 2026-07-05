import Card from './Card';
import Loader from './Loader';

export default function BalanceCard({ balance, loading }) {
  if (loading) return <Card><Loader label="Loading balance..." /></Card>;
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-slate/60">Token Balance</p>
      <p className="mt-1 text-2xl font-bold text-forest">
        {Number(balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} tokens
      </p>
    </Card>
  );
}