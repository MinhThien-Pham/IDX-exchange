import type { ListingRepository } from '../ports/listing-repository.js';

export class SuggestCities {
  constructor(private readonly repository: ListingRepository) {}

  execute(prefix: string): Promise<string[]> {
    return this.repository.suggestCities(prefix.trim().toLowerCase(), 8);
  }
}
