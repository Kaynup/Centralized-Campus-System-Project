export const formatTokens = (value) =>
  `${Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} tokens`;

export const computeAvailable = (wallet) =>
  Number(wallet?.token_balance ?? 0) - Number(wallet?.reserved_tokens ?? 0);

export const computeRemaining = (used, max) => Math.max(Number(max) - Number(used ?? 0), 0);

export const computePercentUsed = (used, max) =>
  max > 0 ? Math.min((Number(used ?? 0) / max) * 100, 100) : 0;