import type { listings, openHouses } from '../../src/platform/db/schema.js';

export type LegacyRow = Record<string, unknown>;
export type ListingInsert = typeof listings.$inferInsert;
export type OpenHouseInsert = typeof openHouses.$inferInsert;
export type Normalized<T> = { value: T | null; warnings: string[] };

export function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint'
    ? String(value).trim()
    : '';
}

// Reject impossible calendar dates rather than letting JavaScript roll into the next month.
export function normalizeDate(value: unknown): string | null {
  const valueText = text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valueText) || valueText.startsWith('0000-')) return null;
  const date = new Date(`${valueText}T00:00:00.000Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === valueText
    ? valueText
    : null;
}

export function normalizeTime(value: unknown): string | null {
  const valueText = text(value);
  if (!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(valueText)) return null;
  return valueText.length === 5 ? `${valueText}:00` : valueText;
}

export function normalizePhotos(value: unknown): string[] {
  let photos: unknown = value;
  if (typeof value === 'string') {
    try {
      photos = JSON.parse(value);
    } catch {
      photos = [value];
    }
  }
  if (!Array.isArray(photos)) return [];
  const valid = photos.flatMap((photo) => {
    if (typeof photo !== 'string') return [];
    try {
      const url = new URL(photo.trim());
      return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
        ? [url.href]
        : [];
    } catch {
      return [];
    }
  });
  return [...new Set(valid)].slice(0, 100);
}

function decimal(value: unknown, max: number, min = 0): string | null {
  const normalized = text(value);
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(normalized)) return null;
  const number = Number(normalized);
  return Number.isFinite(number) && number >= min && number <= max ? normalized : null;
}

function integer(value: unknown, max = 2_147_483_647, min = 0): number | null {
  const valueText = text(value);
  if (!/^[+-]?\d+$/.test(valueText)) return null;
  const number = Number(valueText);
  return Number.isSafeInteger(number) && number >= min && number <= max ? number : null;
}

function jsonObject(value: unknown): LegacyRow {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as LegacyRow;
  try {
    const parsed: unknown = JSON.parse(text(value));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as LegacyRow)
      : {};
  } catch {
    return {};
  }
}

const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>();
function timestampParts(value: unknown, timeZone: string): { date: string; time: string } | null {
  const valueText = text(value);
  const match =
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)(?:\.\d+)?(Z|[+-]\d{2}:\d{2})?$/.exec(
      valueText,
    );
  if (!match || !normalizeDate(match[1]) || !normalizeTime(match[2])) return null;
  // Legacy API_* datetimes are local wall times. ISO values with offsets are
  // instants: convert into the explicitly configured source zone before splitting.
  if (!match[3]) return { date: match[1]!, time: normalizeTime(match[2])! };
  const instant = new Date(valueText.replace(' ', 'T'));
  if (!Number.isFinite(instant.valueOf())) return null;
  let formatter = dateTimeFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    dateTimeFormatters.set(timeZone, formatter);
  }
  const parts = Object.fromEntries(
    formatter.formatToParts(instant).map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}:${parts.second}`,
  };
}

export function normalizeLegacyListing(row: LegacyRow, source: string): Normalized<ListingInsert> {
  const warnings: string[] = [];
  const externalId = text(row.L_ListingID);
  if (!externalId) return { value: null, warnings: ['listing.missing_external_id'] };
  const listedAt = normalizeDate(row.ListingContractDate);
  if (text(row.ListingContractDate) && !listedAt) warnings.push('listing.invalid_date');
  const latitude = decimal(row.LMD_MP_Latitude, 90, -90);
  const longitude = decimal(row.LMD_MP_Longitude, 180, -180);
  if (
    (text(row.LMD_MP_Latitude) && latitude === null) ||
    (text(row.LMD_MP_Longitude) && longitude === null)
  )
    warnings.push('listing.invalid_coordinates');
  const numeric = {
    price: decimal(row.L_SystemPrice, 999_999_999_999.99),
    bedrooms: integer(row.L_Keyword2),
    bathrooms: decimal(row.LM_Dec_3, 9999.9),
    squareFeet: integer(row.LM_Int2_3),
    yearBuilt: integer(row.YearBuilt, 9999, 1),
    lotSizeAcres: decimal(row.LotSizeAcres, 9_999_999_999.9999),
    parkingSpaces: integer(row.L_Keyword5),
  };
  const numericSources: Record<keyof typeof numeric, unknown> = {
    price: row.L_SystemPrice,
    bedrooms: row.L_Keyword2,
    bathrooms: row.LM_Dec_3,
    squareFeet: row.LM_Int2_3,
    yearBuilt: row.YearBuilt,
    lotSizeAcres: row.LotSizeAcres,
    parkingSpaces: row.L_Keyword5,
  };
  for (const key of Object.keys(numeric) as (keyof typeof numeric)[]) {
    if (text(numericSources[key]) && numeric[key] === null) warnings.push(`listing.invalid_${key}`);
  }
  const photos = normalizePhotos(row.L_Photos);
  if (text(row.L_Photos) && text(row.L_Photos) !== '[]' && !photos.length)
    warnings.push('listing.invalid_photos');
  return {
    value: {
      source,
      externalId,
      address: text(row.L_Address),
      city: text(row.L_City),
      state: text(row.L_State),
      zipcode: text(row.L_Zip),
      ...numeric,
      listedAt,
      photos,
      latitude,
      longitude,
      description: text(row.L_Remarks),
      propertyType: text(row.L_Class) || null,
      propertySubType: text(row.PropertySubTypeAdditional) || text(row.L_Type_) || null,
      rawData: row,
    },
    warnings,
  };
}

export function normalizeLegacyOpenHouse(
  row: LegacyRow,
  listingId: string,
  source: string,
  timeZone: string,
): Normalized<OpenHouseInsert> {
  const warnings: string[] = [];
  const raw = jsonObject(row.all_data);
  const externalId =
    text(raw.OpenHouseKey) ||
    text(raw.OpenHouseId) ||
    text(raw.OpenHouseKeyNumeric) ||
    text(row.id);
  const start =
    timestampParts(row.API_OH_StartDate, timeZone) ??
    timestampParts(raw.OpenHouseStartTime, timeZone);
  const end =
    timestampParts(row.API_OH_EndDate, timeZone) ?? timestampParts(raw.OpenHouseEndTime, timeZone);
  const date =
    normalizeDate(row.OpenHouseDate) ??
    normalizeDate(row.OH_StartDate) ??
    normalizeDate(raw.OpenHouseDate) ??
    start?.date ??
    null;
  if (!externalId) return { value: null, warnings: ['open_house.missing_external_id'] };
  if (!date) return { value: null, warnings: ['open_house.invalid_date'] };
  if (text(row.OpenHouseDate) && !normalizeDate(row.OpenHouseDate))
    warnings.push('open_house.invalid_primary_date');
  const startTime = normalizeTime(row.OH_StartTime) ?? start?.time ?? null;
  const endTime = normalizeTime(row.OH_EndTime) ?? end?.time ?? null;
  if (text(row.OH_StartTime) && !normalizeTime(row.OH_StartTime))
    warnings.push('open_house.invalid_start_time');
  if (text(row.OH_EndTime) && !normalizeTime(row.OH_EndTime))
    warnings.push('open_house.invalid_end_time');
  return {
    value: {
      source,
      externalId,
      listingId,
      date,
      startTime,
      endTime,
      timeZone,
      remarks: text(raw.OpenHouseRemarks),
      rawData: row,
    },
    warnings,
  };
}
