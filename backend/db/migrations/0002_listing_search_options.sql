-- Match source subtype spellings without making the business layer depend on SQL.
CREATE INDEX listings_home_type_idx
  ON listings ((regexp_replace(lower(property_sub_type), '[^a-z0-9]', '', 'g')));

-- Prefix suggestions use the normalized city column rather than a wildcard scan.
CREATE INDEX listings_city_prefix_idx ON listings (city_normalized text_pattern_ops);
