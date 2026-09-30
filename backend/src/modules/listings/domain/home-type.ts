export interface HomeType {
  value: string;
  label: string;
}

const groups = [
  [
    'single-family',
    'Single-family',
    ['singlefamily', 'singlefamilyresidence', 'singlefamilyresidential'],
  ],
  ['condo', 'Condo', ['condo', 'condominium']],
  ['townhouse', 'Townhouse', ['townhouse', 'townhome']],
  ['manufactured-on-land', 'Manufactured on land', ['manufacturedonland']],
  ['manufactured-home', 'Manufactured home', ['manufacturedhome']],
  ['mobile-home', 'Mobile home', ['mobilehome']],
  ['co-op', 'Co-op', ['stockcooperative']],
  ['fourplex', 'Fourplex', ['quadruplex', 'fourplex']],
  ['mixed-use', 'Mixed-use', ['mixeduse']],
  ['boat-slip', 'Boat slip', ['boatslip']],
  ['own-your-own', 'Own your own', ['ownyourown']],
  ['co-ownership', 'Co-ownership', ['coownership']],
  ['deeded-parking', 'Deeded parking', ['deededparking']],
] as const;

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

/** One taxonomy for listing badges, available filter choices, and persistence searches. */
export function classifyHomeType(subtype: string | null): HomeType | null {
  const text = subtype?.trim();
  if (!text) return null;
  const key = normalize(text);
  if (!key || ['residential', 'other', 'unknown', 'na'].includes(key)) return null;
  const group = groups.find(([, , aliases]) => aliases.some((alias) => alias === key));
  return group
    ? { value: group[0], label: group[1] }
    : {
        value: key,
        label: text
          .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
          .replace(/[_-]+/g, ' ')
          .replace(/\s+/g, ' '),
      };
}

export function homeTypeSourceKeys(value: string): readonly string[] {
  return groups.find(([key]) => key === value)?.[2] ?? [normalize(value)];
}
