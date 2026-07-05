import Card from '../ui/Card';
import { computeRemaining, computePercentUsed, formatTokens } from './walletUtils';

export default function UsageLimitCard({ title, used, max }) {
  const remaining = computeRemaining(used, max);
  const percent = computePercentUsed(used, max);
  const isNearLimit = percent >= 85;

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-slate">{title}</h3>
        <span className="text-xs text-slate/60">Exhaustive limit</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate/10 overflow-hidden">
        <div
          className={`h-full rounded-full ${isNearLimit ? 'bg-red-500' : 'bg-forest'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-3 flex justify-between text-sm">
        <span>Used: <strong>{formatTokens(used)}</strong></span>
        <span>Remaining: <strong>{formatTokens(remaining)}</strong></span>
      </div>
      <p className="mt-1 text-xs text-slate/50">Max limit: {formatTokens(max)}</p>
    </Card>
  );
}