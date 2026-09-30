import { classifyHomeType, type HomeType } from '../../domain/home-type.js';
import type { ListingRepository } from '../ports/listing-repository.js';

export class GetHomeTypes {
  constructor(private readonly repository: ListingRepository) {}

  async execute(): Promise<HomeType[]> {
    const types = new Map<string, HomeType>();
    for (const subtype of await this.repository.findPropertySubTypes()) {
      const type = classifyHomeType(subtype);
      if (type) types.set(type.value, type);
    }
    const priority = ['single-family', 'condo', 'townhouse'];
    return [...types.values()].sort((a, b) => {
      const rank = (value: string) => {
        const index = priority.indexOf(value);
        return index < 0 ? priority.length : index;
      };
      return rank(a.value) - rank(b.value) || a.label.localeCompare(b.label, 'en');
    });
  }
}
