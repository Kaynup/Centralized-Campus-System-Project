import Card from '../ui/Card';
import StatusBadge from '../ui/StatusBadge';

export default function MarketplaceStatusCard() {
  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-slate">Marketplace</h3>
        <StatusBadge status="Active" tone="gold" />
      </div>
      <p className="text-2xl font-bold text-gold">Unlimited Usage</p>
      <p className="mt-1 text-xs text-slate/50">
        No spending limits apply to Marketplace token usage.
      </p>
    </Card>
  );
}