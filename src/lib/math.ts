import Decimal from 'decimal.js';

// Configure Decimal precision for enterprise financial standard
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

/**
 * Parses numeric input safely into Decimal.
 */
export function toDecimal(value: number | string | Decimal | null | undefined): Decimal {
  if (value === null || value === undefined || value === '') {
    return new Decimal(0);
  }
  if (value instanceof Decimal) {
    return value;
  }
  try {
    return new Decimal(value);
  } catch {
    return new Decimal(0);
  }
}

/**
 * Formats a Decimal into USD currency string standard "$1,234.56"
 */
export function formatCurrency(
  value: number | string | Decimal,
  currency: string = 'USD'
): string {
  const dec = toDecimal(value);
  const formattedNumber = dec.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `$${formattedNumber} ${currency !== 'USD' ? currency : ''}`.trim();
}

/**
 * Checks if total debits match total credits with exact zero tolerance.
 */
export function isBalanced(
  debits: (number | string | Decimal)[],
  credits: (number | string | Decimal)[]
): { balanced: boolean; totalDebit: Decimal; totalCredit: Decimal; difference: Decimal } {
  const totalDebit = debits.reduce<Decimal>((acc, val) => acc.plus(toDecimal(val)), new Decimal(0));
  const totalCredit = credits.reduce<Decimal>((acc, val) => acc.plus(toDecimal(val)), new Decimal(0));
  const difference = totalDebit.minus(totalCredit).abs();
  return {
    balanced: totalDebit.equals(totalCredit),
    totalDebit,
    totalCredit,
    difference,
  };
}

/**
 * Precision percentage computation: (amount * rate) / 100
 */
export function calcPercentage(amount: Decimal | number | string, ratePercent: number | string): Decimal {
  const decAmount = toDecimal(amount);
  const decRate = toDecimal(ratePercent);
  return decAmount.times(decRate).dividedBy(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}
