import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { MapPin } from 'lucide-react';
import { useCitySuggestions } from '../hooks/useSearchOptions';
import './LocationInput.css';

export default function LocationInput({
  value,
  onChange,
  className = '',
  error,
  errorId,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  error?: boolean;
  errorId?: string;
}) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [active, setActive] = useState(-1);
  const list = useRef<HTMLUListElement>(null);
  const prefix = value.trim();
  const isZip = /^\d{1,5}(?:-\d{0,4})?$/.test(prefix);
  const open = focused && Boolean(prefix) && !isZip && dismissed !== value;
  const suggestions = useCitySuggestions(value, open);
  const cities = suggestions.data ?? [];

  useLayoutEffect(() => {
    const option = list.current?.children[active];
    if (option instanceof HTMLElement) option.scrollIntoView?.({ block: 'nearest' });
  }, [active]);

  function choose(city: string) {
    onChange(city);
    setDismissed(city);
    setActive(-1);
  }
  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      setDismissed(value);
      setActive(-1);
    } else if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && cities.length) {
      event.preventDefault();
      setDismissed(null);
      setActive((current) =>
        event.key === 'ArrowDown'
          ? Math.min(current + 1, cities.length - 1)
          : current < 0
            ? cities.length - 1
            : Math.max(0, current - 1),
      );
    } else if (event.key === 'Enter' && open && active >= 0 && cities[active]) {
      event.preventDefault();
      choose(cities[active]);
    }
  }
  return (
    <div className={`field location-input ${className}`}>
      <label htmlFor={id}>City or ZIP code</label>
      <input
        id={id}
        name="location"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? `${id}-cities` : undefined}
        aria-activedescendant={open && cities[active] ? `${id}-city-${active}` : undefined}
        aria-invalid={error || undefined}
        aria-describedby={error ? errorId : undefined}
        autoComplete="off"
        placeholder="e.g. San Diego or 92101"
        maxLength={100}
        value={value}
        onFocus={() => {
          setFocused(true);
          setDismissed(null);
        }}
        onBlur={() => {
          setFocused(false);
          setActive(-1);
        }}
        onChange={(event) => {
          onChange(event.target.value);
          setActive(-1);
          setDismissed(null);
        }}
        onKeyDown={keyDown}
      />
      {open && (
        <div className="location-suggestions">
          <p className="suggestions-heading">Cities with listings</p>
          <ul id={`${id}-cities`} ref={list} role="listbox" aria-label="Suggested cities">
            {cities.map((city, index) => (
              <li
                id={`${id}-city-${index}`}
                role="option"
                aria-selected={active === index}
                key={city}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(city)}
              >
                <MapPin aria-hidden="true" />
                {city}
              </li>
            ))}
          </ul>
          <p className="suggestions-status" role="status">
            {suggestions.isError
              ? 'City suggestions are unavailable. You can still search.'
              : suggestions.isPending
                ? 'Finding cities…'
                : cities.length
                  ? `${cities.length} ${cities.length === 1 ? 'city' : 'cities'} suggested. Select one or enter a ZIP code.`
                  : 'No matching cities in this inventory.'}
          </p>
        </div>
      )}
    </div>
  );
}
