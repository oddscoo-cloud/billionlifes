import type { CountryCode } from './demographics';

export type CountryRegion = 'europe' | 'asia' | 'africa' | 'americas' | 'oceania' | 'middle-east';

const regionCodes: Readonly<Record<CountryRegion, readonly CountryCode[]>> = {
  europe: ['AD', 'AL', 'AT', 'BA', 'BE', 'BG', 'BY', 'CH', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GB', 'GR', 'HR', 'HU', 'IE', 'IS', 'IT', 'LI', 'LT', 'LU', 'LV', 'MC', 'MD', 'ME', 'MK', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'RS', 'RU', 'SE', 'SI', 'SK', 'SM', 'UA'],
  asia: ['AF', 'AM', 'AZ', 'BD', 'BT', 'BN', 'CN', 'GE', 'ID', 'IN', 'JP', 'KH', 'KG', 'KP', 'KR', 'KZ', 'LA', 'LK', 'MM', 'MN', 'MY', 'NP', 'PH', 'PK', 'SG', 'TH', 'TJ', 'TL', 'TM', 'UZ', 'VN'],
  africa: ['AO', 'BF', 'BI', 'BJ', 'BW', 'CD', 'CF', 'CG', 'CI', 'CM', 'CV', 'DJ', 'DZ', 'EG', 'ER', 'ET', 'GA', 'GH', 'GM', 'GN', 'GQ', 'GW', 'KE', 'KM', 'LR', 'LS', 'LY', 'MA', 'MG', 'ML', 'MR', 'MU', 'MW', 'MZ', 'NA', 'NE', 'NG', 'RW', 'SC', 'SD', 'SL', 'SN', 'SO', 'SS', 'ST', 'SZ', 'TD', 'TG', 'TN', 'TZ', 'UG', 'ZA', 'ZM', 'ZW'],
  americas: ['AG', 'AR', 'BB', 'BO', 'BR', 'BS', 'BZ', 'CA', 'CL', 'CO', 'CR', 'CU', 'DM', 'DO', 'EC', 'GD', 'GT', 'GY', 'HN', 'HT', 'JM', 'KN', 'LC', 'MX', 'NI', 'PA', 'PE', 'PY', 'SR', 'SV', 'TT', 'US', 'UY', 'VC', 'VE'],
  oceania: ['AU', 'FJ', 'FM', 'KI', 'MH', 'NR', 'NZ', 'PW', 'PG', 'SB', 'TO', 'TV', 'VU', 'WS'],
  'middle-east': ['AE', 'BH', 'IL', 'IQ', 'IR', 'JO', 'KW', 'LB', 'OM', 'QA', 'SA', 'SY', 'TR', 'YE'],
};

const countryRegions = new Map<CountryCode, CountryRegion>(
  Object.entries(regionCodes).flatMap(([region, codes]) => codes.map((code) => [code, region as CountryRegion])),
);

export function countryRegion(code: CountryCode): CountryRegion {
  return countryRegions.get(code) ?? 'asia';
}
