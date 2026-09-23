/** Region → currency for the handful of places we're likely to be demoed; USD otherwise. */
const CURRENCY_BY_REGION: Record<string, string> = {
  GB: 'GBP', US: 'USD', SG: 'SGD', AU: 'AUD', NZ: 'NZD', CA: 'CAD', IE: 'EUR', DE: 'EUR', FR: 'EUR', NL: 'EUR',
  ES: 'EUR', IT: 'EUR', MY: 'MYR', IN: 'INR', HK: 'HKD', JP: 'JPY',
};

function localCurrency(): string {
  try {
    const locale = Intl.NumberFormat().resolvedOptions().locale;
    const region = new Intl.Locale(locale).maximize().region ?? '';
    return CURRENCY_BY_REGION[region] ?? 'USD';
  } catch {
    return 'USD';
  }
}

const CURRENCY = localCurrency();

/** "≈ £23" — whole units only; these are estimates. */
export function formatMoney(amount: number): string {
  try {
    return `≈ ${new Intl.NumberFormat(undefined, { style: 'currency', currency: CURRENCY, maximumFractionDigits: 0 }).format(amount)}`;
  } catch {
    return `≈ ${amount}`;
  }
}
