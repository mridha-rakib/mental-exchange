const COUNTRY_ALIASES = new Map([
  ['DE', 'DE'],
  ['DEU', 'DE'],
  ['GERMANY', 'DE'],
  ['DEUTSCHLAND', 'DE'],
  ['FEDERAL REPUBLIC OF GERMANY', 'DE'],
  ['BUNDESREPUBLIK DEUTSCHLAND', 'DE'],

  ['BD', 'BD'],
  ['BGD', 'BD'],
  ['BANGLADESH', 'BD'],

  ['AT', 'AT'],
  ['AUT', 'AT'],
  ['AUSTRIA', 'AT'],
  ['OSTERREICH', 'AT'],
  ['OESTERREICH', 'AT'],

  ['CH', 'CH'],
  ['CHE', 'CH'],
  ['SWITZERLAND', 'CH'],
  ['SCHWEIZ', 'CH'],

  ['NL', 'NL'],
  ['NLD', 'NL'],
  ['NETHERLANDS', 'NL'],
  ['THE NETHERLANDS', 'NL'],
  ['NIEDERLANDE', 'NL'],

  ['BE', 'BE'],
  ['BEL', 'BE'],
  ['BELGIUM', 'BE'],
  ['BELGIEN', 'BE'],

  ['FR', 'FR'],
  ['FRA', 'FR'],
  ['FRANCE', 'FR'],
  ['FRANKREICH', 'FR'],

  ['IT', 'IT'],
  ['ITA', 'IT'],
  ['ITALY', 'IT'],
  ['ITALIEN', 'IT'],

  ['ES', 'ES'],
  ['ESP', 'ES'],
  ['SPAIN', 'ES'],
  ['SPANIEN', 'ES'],

  ['PL', 'PL'],
  ['POL', 'PL'],
  ['POLAND', 'PL'],
  ['POLEN', 'PL'],

  ['US', 'US'],
  ['USA', 'US'],
  ['UNITED STATES', 'US'],
  ['UNITED STATES OF AMERICA', 'US'],
]);

export const normalizeCountryCode = (country, fallback = 'DE') => {
  const raw = String(country || '').trim();
  if (!raw) return fallback;

  const normalized = raw
    .normalize('NFKC')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');

  if (COUNTRY_ALIASES.has(normalized)) {
    return COUNTRY_ALIASES.get(normalized);
  }

  if (/^[A-Z]{2}$/.test(normalized)) {
    return normalized;
  }

  return raw.toUpperCase();
};

export default normalizeCountryCode;
