export const supportedCurrencies = {
  EUR: {
    code: "EUR",
    name: "Euro",
    symbol: "€",
  },
  ALL: {
    code: "ALL",
    name: "Albanian Lek",
    symbol: "L",
  },
  USD: {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
  },
  GBP: {
    code: "GBP",
    name: "British Pound",
    symbol: "£",
  },
} as const;

export type CurrencyCode =
  keyof typeof supportedCurrencies;

export function isCurrencyCode(
  value: string | null | undefined
): value is CurrencyCode {
  if (!value) {
    return false;
  }

  return value in supportedCurrencies;
}

export function getCurrencyCode(
  value: string | null | undefined
): CurrencyCode {
  if (isCurrencyCode(value)) {
    return value;
  }

  return "EUR";
}

export function getCurrencySymbol(
  currency: CurrencyCode
) {
  return supportedCurrencies[currency].symbol;
}

export function formatMoney(
  amount: number,
  currency: CurrencyCode
) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits:
      currency === "ALL" ? 0 : 2,
    maximumFractionDigits:
      currency === "ALL" ? 0 : 2,
  }).format(amount);
}

export function formatCompactMoney(
  amount: number,
  currency: CurrencyCode
) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}