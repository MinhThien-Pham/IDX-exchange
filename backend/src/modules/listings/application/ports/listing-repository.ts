import type { Listing } from '../../domain/listing.js';

export interface ListingSearch {
  city?: string;
  zipcode?: string;
  minPrice?: number;
  maxPrice?: number;
  beds?: number;
  baths?: number;
  limit: number;
  offset: number;
  sortBy: 'price' | 'listedAt' | 'squareFeet' | 'bedrooms';
  sortOrder: 'ASC' | 'DESC';
}

export interface ListingSearchResult {
  total: number;
  limit: number;
  offset: number;
  results: Listing[];
}

export interface ListingRepository {
  search(query: ListingSearch): Promise<ListingSearchResult>;
  findById(id: string): Promise<Listing | null>;
  exists(id: string): Promise<boolean>;
}
