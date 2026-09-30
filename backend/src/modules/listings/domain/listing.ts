import type { HomeType } from './home-type.js';

/** Canonical business data. Source MLS column names stop at the repository boundary. */
export interface Listing {
  id: string;
  source: string;
  externalId: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  listedAt: string | null;
  photos: string[];
  latitude: number | null;
  longitude: number | null;
  description: string;
  propertyType: string | null;
  propertySubType: string | null;
  homeType: HomeType | null;
  yearBuilt: number | null;
  lotSizeAcres: number | null;
  parkingSpaces: number | null;
}
