import { useEffect, useState } from "react";
import { getTransactions } from "../api/api";
import AdminTableLayout from "./AdminTableLayout";

export default function TransactionsTable() {
  const [transactions, setTransactions] = useState([]);
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    async function fetchTransactions() {
      try {
        const data = await getTransactions();
        setTransactions(data);
      } catch (error) {
        console.error(error);
      }
    }

    fetchTransactions();
  }, []);

  function formatDate(date) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getTypeStyle(type) {
    switch (type) {
      case "deposit_lock":
        return "bg-amber-100 text-amber-700";

      case "deposit_unlock":
        return "bg-green-100 text-green-700";

      case "late_fee_deduction":
        return "bg-red-100 text-red-700";

      case "wallet_add":
        return "bg-blue-100 text-blue-700";

      case "wallet_deduct":
        return "bg-purple-100 text-purple-700";

      default:
        return "bg-stone-100 text-stone-700";
    }
  }

  const filterMap = {
    all: () => true,

    deposits: (tx) =>
      tx.transaction_type === "deposit_lock" ||
      tx.transaction_type === "deposit_unlock",

    wallet: (tx) =>
      tx.transaction_type === "wallet_add" ||
      tx.transaction_type === "wallet_deduct",


    late: (tx) => tx.transaction_type === "late_fee_deduction",

  };

  const filteredTransactions = transactions.filter(
    filterMap[typeFilter] || (() => true)
  );

  const filters = (
    <div className="flex flex-wrap gap-2 mb-4">
      <button
        onClick={() => setTypeFilter("all")}
        className={`px-4 py-1.5 rounded-full text-sm border ${
          typeFilter === "all"
            ? "bg-stone-900 text-white"
            : "bg-white text-stone-600 border-stone-200"
        }`}
      >
        All
      </button>

      <button
        onClick={() => setTypeFilter("deposits")}
        className={`px-4 py-1.5 rounded-full text-sm border ${
          typeFilter === "deposits"
            ? "bg-amber-600 text-white"
            : "bg-white text-stone-600 border-stone-200"
        }`}
      >
        Deposits
      </button>

      <button
        onClick={() => setTypeFilter("wallet")}
        className={`px-4 py-1.5 rounded-full text-sm border ${
          typeFilter === "wallet"
            ? "bg-blue-600 text-white"
            : "bg-white text-stone-600 border-stone-200"
        }`}
      >
        Wallet
      </button>

      <button
        onClick={() => setTypeFilter("late")}
        className={`px-4 py-1.5 rounded-full text-sm border ${
          typeFilter === "late"
            ? "bg-red-600 text-white"
            : "bg-white text-stone-600 border-stone-200"
        }`}
      >
        Late Fees
      </button>

      <button
        onClick={() => setTypeFilter("all")}
        className="ml-auto px-4 py-1.5 rounded-full text-sm border border-stone-200 text-stone-600 hover:bg-stone-50"
      >
        Clear
      </button>
    </div>
  );

  return (
    <AdminTableLayout
      sectionLabel="Financial"
      title="Transactions"
      toolbar={filters}
      isEmpty={filteredTransactions.length === 0}
      emptyMessage="No transactions found."
    >
      <table className="w-full">
        <thead>
          <tr className="border-b border-stone-100">
            <th className="text-left px-6 py-4 text-xs tracking-widest text-stone-400">
              Student
            </th>

            <th className="text-left px-6 py-4 text-xs tracking-widest text-stone-400">
              Type
            </th>

            <th className="text-left px-6 py-4 text-xs tracking-widest text-stone-400">
              Amount
            </th>

            <th className="text-left px-6 py-4 text-xs tracking-widest text-stone-400">
              Before
            </th>

            <th className="text-left px-6 py-4 text-xs tracking-widest text-stone-400">
              After
            </th>

            <th className="text-left px-6 py-4 text-xs tracking-widest text-stone-400">
              Date
            </th>
          </tr>
        </thead>

        <tbody>
          {filteredTransactions.map((tx, index) => (
            <tr
              key={tx.id}
              className={`border-b border-stone-50 hover:bg-stone-50 ${
                index === filteredTransactions.length - 1 ? "border-none" : ""
              }`}
            >
              <td className="px-6 py-4 text-sm text-stone-700">
                {tx.full_name}
              </td>

              <td className="px-6 py-4 text-sm">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeStyle(
                    tx.transaction_type
                  )}`}
                >
                  {tx.transaction_type.replaceAll("_", " ")}
                </span>
              </td>

              <td className="px-6 py-4 text-sm text-stone-700">
                Rs {tx.amount}
              </td>

              <td className="px-6 py-4 text-sm text-stone-700">
                {tx.balance_before}
              </td>

              <td className="px-6 py-4 text-sm text-stone-700">
                {tx.balance_after}
              </td>

              <td className="px-6 py-4 text-sm text-stone-700">
                {formatDate(tx.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminTableLayout>
  );
}