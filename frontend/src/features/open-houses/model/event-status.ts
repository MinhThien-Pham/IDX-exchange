import { type OpenHouseDto } from '@idx/contracts';

export function eventStatus(event: OpenHouseDto, now = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: event.timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
    const part = (name: Intl.DateTimeFormatPartTypes) =>
      parts.find((item) => item.type === name)?.value ?? '';
    const today = `${part('year')}-${part('month')}-${part('day')}`;
    const time = `${part('hour')}:${part('minute')}:${part('second')}`;
    const past =
      event.date < today ||
      (event.date === today && Boolean(event.endTime && event.endTime <= time));
    return {
      past,
      label: past ? 'Past event · Recorded schedule' : event.date === today ? 'Today' : 'Upcoming',
    };
  } catch {
    return { past: false, label: 'Recorded schedule' };
  }
}
