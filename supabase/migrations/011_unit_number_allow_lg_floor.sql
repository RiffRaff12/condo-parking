-- Allow LG as a valid floor in unit_number (alongside G and numeric floors 01-15)
ALTER TABLE residents_directory DROP CONSTRAINT unit_number_format;
ALTER TABLE residents_directory
  ADD CONSTRAINT unit_number_format
  CHECK (unit_number ~ '^[12]-(LG|G|[0-9]{2})-[0-9]{2}$')
  NOT VALID;
