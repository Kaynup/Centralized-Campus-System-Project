import Table from '../ui/Table';
import Loader from '../ui/Loader';
import EmptyState from '../ui/EmptyState';
import TransactionTypeBadge from './TransactionTypeBadge';
import { TRANSACTION_TYPE_META, REFERENCE_TYPE_LABEL } from './constants';
import { formatTokens } from './walletUtils';

export default function TransactionHistoryTable({ transactions, loading, error, onRetry }) {
  if (loading) return <Loader label="Loading transactions..." />;
  if (error) return <EmptyState title="Couldn't load transactions" description={error} actionLabel="Retry" onAction={onRetry} />;
  if (!transactions?.length) return <EmptyState title="No transactions yet" description="Your activity will show up here." />;

  return (
    <Table
      columns={['Type', 'Domain', 'Amount', 'Balance After', 'Description', 'Date']}
      rows={transactions.map((tx) => ({
        key: tx.id,
        cells: [
          <TransactionTypeBadge type={tx.transaction_type} />,
          REFERENCE_TYPE_LABEL[tx.reference_type] ?? tx.reference_type,
          <span className={TRANSACTION_TYPE_META[tx.transaction_type]?.tone === 'success' ? 'text-forest' : 'text-red-600'}>
            {TRANSACTION_TYPE_META[tx.transaction_type]?.sign}{formatTokens(Math.abs(tx.token_amount))}
          </span>,
          formatTokens(tx.token_balance_after),
          tx.description || '—',
          new Date(tx.created_at).toLocaleString(),
        ],
      }))}
    />
  );
}