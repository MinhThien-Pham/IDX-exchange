import { type OpenHouseDto } from '@idx/contracts';
import { eventStatus } from './event-status';

const event: OpenHouseDto = {
  id: '1',
  listingId: '1',
  date: '2026-08-29',
  startTime: '10:00:00',
  endTime: '18:00:00',
  timeZone: 'America/Los_Angeles',
  remarks: '',
};
test('event classification uses the property timezone rather than the UTC calendar day', () => {
  expect(eventStatus(event, new Date('2026-08-30T00:30:00Z'))).toEqual({
    past: false,
    label: 'Today',
  });
  expect(eventStatus(event, new Date('2026-08-30T01:30:00Z'))).toEqual({
    past: true,
    label: 'Past event · Recorded schedule',
  });
});
test('future and historical events are distinct and missing end times do not imply an event has finished', () => {
  expect(eventStatus(event, new Date('2026-08-28T18:00:00Z')).label).toBe('Upcoming');
  expect(eventStatus(event, new Date('2026-10-18T12:00:00Z')).past).toBe(true);
  expect(eventStatus({ ...event, endTime: null }, new Date('2026-08-30T01:30:00Z')).label).toBe(
    'Today',
  );
});
test('invalid source timezone remains readable without claiming the event is upcoming', () => {
  expect(eventStatus({ ...event, timeZone: 'invalid/timezone' }).label).toBe('Recorded schedule');
});
