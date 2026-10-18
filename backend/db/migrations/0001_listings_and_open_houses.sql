-- The legacy MLS ID belongs to a source. Public API IDs are independent UUIDs.
CREATE TABLE listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (length(btrim(source)) > 0),
  external_id text NOT NULL CHECK (length(btrim(external_id)) > 0),
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  city_normalized text GENERATED ALWAYS AS (lower(btrim(city))) STORED,
  state text NOT NULL DEFAULT '',
  zipcode text NOT NULL DEFAULT '',
  price numeric(14,2) CHECK (price >= 0),
  bedrooms integer CHECK (bedrooms >= 0),
  bathrooms numeric(5,1) CHECK (bathrooms >= 0),
  square_feet integer CHECK (square_feet >= 0),
  listed_at date,
  photos text[] NOT NULL DEFAULT '{}',
  latitude numeric(18,15) CHECK (latitude BETWEEN -90 AND 90),
  longitude numeric(19,15) CHECK (longitude BETWEEN -180 AND 180),
  description text NOT NULL DEFAULT '',
  property_type text,
  property_sub_type text,
  year_built integer CHECK (year_built BETWEEN 1 AND 9999),
  lot_size_acres numeric(14,4) CHECK (lot_size_acres >= 0),
  parking_spaces integer CHECK (parking_spaces >= 0),
  raw_data jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX listings_source_external_id_unique ON listings(source, external_id);
CREATE INDEX listings_city_normalized_idx ON listings(city_normalized);
CREATE INDEX listings_zipcode_idx ON listings(zipcode);
CREATE INDEX listings_price_id_idx ON listings(price ASC NULLS LAST, id ASC);
CREATE INDEX listings_listed_at_id_idx ON listings(listed_at DESC NULLS LAST, id ASC);

-- A local calendar date + wall-clock time + IANA zone preserves DST semantics.
CREATE TABLE open_houses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (length(btrim(source)) > 0),
  external_id text NOT NULL CHECK (length(btrim(external_id)) > 0),
  date date NOT NULL,
  start_time time(0),
  end_time time(0),
  time_zone text NOT NULL CHECK (length(btrim(time_zone)) > 0),
  remarks text NOT NULL DEFAULT '',
  raw_data jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX open_houses_source_external_id_unique ON open_houses(source, external_id);
CREATE INDEX open_houses_listing_date_time_idx ON open_houses(listing_id, date, start_time, id);
