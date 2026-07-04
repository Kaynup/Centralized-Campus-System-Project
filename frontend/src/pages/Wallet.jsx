import { useState } from 'react';
import Button from '../shared/ui/Button';
import EmptyState from '../shared/ui/EmptyState';
import { useWallet } from '../shared/hooks/useWallet';
import TokenBalanceCard from '../shared/wallet/TokenBalanceCard';
import UsageLimitCard from '../shared/wallet/UsageLimitCard';
import MarketplaceStatusCard from '../shared/wallet/MarketplaceStatusCard';
import TransactionHistoryTable from '../shared/wallet/TransactionHistoryTable';
import TopUpModal from '../shared/wallet/TopUpModal';
import { MAX_FACILITY_LIMIT, MAX_RENTAL_LIMIT } from '../shared/wallet/constants';

export default function Wallet() {
  const { wallet, transactions, loading, txLoading, error, refresh, loadTransactions } = useWallet();
  const [topUpOpen, setTopUpOpen] = useState(false);

  if (error && !wallet) {
    return <EmptyState title="Something went wrong" description={error} actionLabel="Retry" onAction={refresh} />;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate">Wallet</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={refresh}>Refresh</Button>
          <Button onClick={() => setTopUpOpen(true)}>Top Up</Button>
        </div>
      </div>

      <TokenBalanceCard wallet={wallet} loading={loading} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <UsageLimitCard title="Facility Tokens" used={wallet?.facility_tokens_used} max={MAX_FACILITY_LIMIT} />
        <UsageLimitCard title="Equipment Tokens" used={wallet?.rental_tokens_used} max={MAX_RENTAL_LIMIT} />
        <MarketplaceStatusCard />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate mb-3">Recent Transactions</h2>
        <TransactionHistoryTable
          transactions={transactions}
          loading={txLoading}
          error={error}
          onRetry={() => loadTransactions()}
        />
      </div>

      <TopUpModal isOpen={topUpOpen} onClose={() => setTopUpOpen(false)} />
    </div>
  );
}