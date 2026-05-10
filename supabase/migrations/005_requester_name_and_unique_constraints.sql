-- Replace composite unique constraint with individual ones
alter table residents_directory
  drop constraint residents_directory_phone_unit_bay_unique;

alter table residents_directory
  add constraint residents_directory_phone_unique unique (phone),
  add constraint residents_directory_unit_number_unique unique (unit_number),
  add constraint residents_directory_bay_number_unique unique (bay_number);

-- Add requester name to requests (stored at creation time)
alter table requests
  add column requester_name text;
