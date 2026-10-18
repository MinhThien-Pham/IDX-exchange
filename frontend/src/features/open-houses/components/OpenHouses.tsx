import { formatOpenHouseDate, formatTime } from '../../../shared/utils/formatting';
import { useOpenHouses } from '../hooks/useOpenHouses';

export default function OpenHouses({ listingId }: { listingId: string }) {
  const query = useOpenHouses(listingId);
  return (
    <section className="sidebar-box">
      <h2>Open Houses</h2>
      {query.isPending ? (
        <p role="status">Loading open houses...</p>
      ) : query.isError ? (
        <div role="alert">
          <p>Unable to load open houses.</p>
          <button onClick={() => void query.refetch()}>Retry open houses</button>
        </div>
      ) : !query.data.length ? (
        <p className="no-open-houses">No open houses scheduled</p>
      ) : (
        <div className="open-house-list">
          {query.data.map((house) => (
            <article className="open-house-item" key={house.id}>
              <strong>{formatOpenHouseDate(house.date)}</strong>
              <p className="open-house-time">
                {formatTime(house.startTime)} - {formatTime(house.endTime)}
              </p>
              <p>{house.timeZone}</p>
              {house.remarks && <p className="open-house-remarks">{house.remarks}</p>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
