export interface OpenHouse {
  id: string;
  listingId: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  timeZone: string;
  remarks: string;
}
