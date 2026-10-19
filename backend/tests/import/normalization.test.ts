import {
  normalizeDate,
  normalizeMlsListing,
  normalizeMlsOpenHouse,
  normalizePhotos,
  normalizeTime,
} from '../../scripts/lib/normalize-mls.js';

describe('MLS import normalization', () => {
  test('keeps identifiers and ZIP codes as strings and money as an exact decimal', () => {
    const { value } = normalizeMlsListing(
      {
        L_ListingID: '000123',
        L_Zip: '02108',
        L_SystemPrice: '825000.10',
        LM_Dec_3: '2.5',
        L_City: '  Boston  ',
      },
      'test',
    );
    expect(value).toMatchObject({
      externalId: '000123',
      zipcode: '02108',
      price: '825000.10',
      bathrooms: '2.5',
      city: 'Boston',
    });
  });

  test('rejects impossible and MySQL zero dates instead of rolling dates forward', () => {
    expect(normalizeDate('2024-02-29')).toBe('2024-02-29');
    for (const value of [
      '2025-02-29',
      '2026-13-01',
      '0000-00-00',
      '2026-01-00',
      '2026-01-01T12:00:00Z',
      '',
      null,
    ])
      expect(normalizeDate(value)).toBeNull();
    const result = normalizeMlsListing(
      { L_ListingID: '1', ListingContractDate: '0000-00-00' },
      'test',
    );
    expect(result.value?.listedAt).toBeNull();
    expect(result.warnings).toContain('listing.invalid_date');
  });

  test('allows only HTTP(S) photo URLs, removes duplicates, and handles malformed source values', () => {
    expect(
      normalizePhotos(
        '["https://example.com/a.jpg", "javascript:alert(1)", "https://example.com/a.jpg", "file:///secret"]',
      ),
    ).toEqual(['https://example.com/a.jpg']);
    expect(normalizePhotos(' https://example.com/single.jpg ')).toEqual([
      'https://example.com/single.jpg',
    ]);
    expect(normalizePhotos(['https://user:password@example.com/photo', 42, null])).toEqual([]);
    expect(normalizePhotos('{not json}')).toEqual([]);
  });

  test('does not turn missing values into zero; reports invalid source numbers and coordinates', () => {
    const result = normalizeMlsListing(
      {
        L_ListingID: '1',
        L_SystemPrice: '',
        L_Keyword2: -1,
        LM_Dec_3: '2.5',
        LMD_MP_Latitude: '91',
        LMD_MP_Longitude: '-180.0',
      },
      'test',
    );
    expect(result.value).toMatchObject({
      price: null,
      bedrooms: null,
      bathrooms: '2.5',
      latitude: null,
      longitude: '-180.0',
    });
    expect(result.warnings).toEqual(
      expect.arrayContaining(['listing.invalid_coordinates', 'listing.invalid_bedrooms']),
    );
    expect(normalizeMlsListing({ L_ListingID: ' ' }, 'test').value).toBeNull();
  });

  test('preserves local open house wall time, IANA zone, source key and remarks', () => {
    const result = normalizeMlsOpenHouse(
      {
        id: 42,
        OpenHouseDate: '2026-11-01',
        OH_StartTime: '13:00',
        OH_EndTime: '16:30:00',
        all_data: '{"OpenHouseKey":"source-42","OpenHouseRemarks":"Sample"}',
      },
      'listing-uuid',
      'crmls',
      'America/Los_Angeles',
    );
    expect(result.value).toMatchObject({
      externalId: 'source-42',
      date: '2026-11-01',
      startTime: '13:00:00',
      endTime: '16:30:00',
      timeZone: 'America/Los_Angeles',
      remarks: 'Sample',
    });
    expect(
      normalizeMlsOpenHouse(
        { id: 1, OpenHouseDate: '0000-00-00' },
        'id',
        'source',
        'America/Los_Angeles',
      ).value,
    ).toBeNull();
    expect(normalizeTime('25:00:00')).toBeNull();
  });

  test('uses alternate source timestamps and converts offset instants to the configured zone', () => {
    const fromApi = normalizeMlsOpenHouse(
      { id: 1, API_OH_StartDate: '2026-11-01 13:00:00', API_OH_EndDate: '2026-11-01 16:00:00' },
      'id',
      'source',
      'America/Los_Angeles',
    );
    expect(fromApi.value).toMatchObject({
      date: '2026-11-01',
      startTime: '13:00:00',
      endTime: '16:00:00',
    });
    const fromRaw = normalizeMlsOpenHouse(
      {
        id: 1,
        all_data:
          '{"OpenHouseStartTime":"2026-11-01T21:00:00Z","OpenHouseEndTime":"2026-11-02T00:00:00Z"}',
      },
      'id',
      'source',
      'America/Los_Angeles',
    );
    expect(fromRaw.value).toMatchObject({
      date: '2026-11-01',
      startTime: '13:00:00',
      endTime: '16:00:00',
    });
  });
});
