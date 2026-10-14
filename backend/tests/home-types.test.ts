import { classifyHomeType, homeTypeSourceKeys } from '../src/modules/listings/domain/home-type.js';
import { GetHomeTypes } from '../src/modules/listings/application/use-cases/get-home-types.js';
import { SuggestCities } from '../src/modules/listings/application/use-cases/suggest-cities.js';
import { createRepositoryMocks } from './helpers/fixtures.js';

test.each([
  ['SingleFamilyResidence', 'single-family', 'Single-family'],
  [' Single Family Residence ', 'single-family', 'Single-family'],
  ['Single Family', 'single-family', 'Single-family'],
  ['Condominium', 'condo', 'Condo'],
  ['Townhouse', 'townhouse', 'Townhouse'],
  ['ManufacturedOnLand', 'manufactured-on-land', 'Manufactured on land'],
  ['StockCooperative', 'co-op', 'Co-op'],
  ['Duplex', 'duplex', 'Duplex'],
  ['UnrecognizedFutureSubtype', 'unrecognizedfuturesubtype', 'Unrecognized Future Subtype'],
  ['constructor', 'constructor', 'constructor'],
])('classifies %s consistently for badges and filters', (subtype, value, label) => {
  expect(classifyHomeType(subtype)).toEqual({ value, label });
  expect(homeTypeSourceKeys(value)).toContain(subtype.toLowerCase().replace(/[^a-z0-9]/g, ''));
});

test.each(['', null, 'Residential', 'Other', '---'])('omits generic subtype %s', (value) => {
  expect(classifyHomeType(value)).toBeNull();
});

test('available choices collapse source aliases and omit empty classifications', async () => {
  const { listings } = createRepositoryMocks();
  listings.findPropertySubTypes.mockResolvedValue([
    'Townhouse',
    'Duplex',
    'Residential',
    'Single Family',
    'SingleFamilyResidence',
    'Condominium',
    'Loft',
  ]);
  expect(await new GetHomeTypes(listings).execute()).toEqual([
    { value: 'single-family', label: 'Single-family' },
    { value: 'condo', label: 'Condo' },
    { value: 'townhouse', label: 'Townhouse' },
    { value: 'duplex', label: 'Duplex' },
    { value: 'loft', label: 'Loft' },
  ]);
});

test('city suggestions normalize a prefix and bound the result size', async () => {
  const { listings } = createRepositoryMocks();
  await expect(new SuggestCities(listings).execute(' Bos ')).resolves.toEqual(['Boston']);
  expect(listings.suggestCities).toHaveBeenCalledWith('bos', 8);
});
