import { formatOpenHouseDate, formatTime } from '../../../shared/utils/formatting';
import { useOpenHouses } from '../hooks/useOpenHouses';
import { CalendarDays } from 'lucide-react';
import { eventStatus } from '../model/event-status';

export default function OpenHouses({ listingId }: { listingId: string }) {
  const query = useOpenHouses(listingId);
  return (
    <section className="open-houses">
      <h2>
        <CalendarDays aria-hidden="true" />
        Open houses
      </h2>
      {query.isPending ? (
        <p role="status">Loading open houses...</p>
      ) : query.isError ? (
        <div role="alert">
          <p>Unable to load open houses.</p>
          <button onClick={() => void query.refetch()}>Retry open houses</button>
        </div>
      ) : !query.data.length ? (
        <p className="no-open-houses">No open houses listed.</p>
      ) : (
        <div className="open-house-list">
          {query.data.map((house) => {
            const status = eventStatus(house);
            return (
              <article className="open-house-item" key={house.id}>
                <time dateTime={house.date}>{formatOpenHouseDate(house.date)}</time>
                <p className="open-house-time">
                  {formatTime(house.startTime)} - {formatTime(house.endTime)}
                </p>
                <p className="open-house-zone">{house.timeZone}</p>
                <span className="open-house-status" data-past={status.past}>
                  {status.label}
                </span>
                {house.remarks && <p className="open-house-remarks">{house.remarks}</p>}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
