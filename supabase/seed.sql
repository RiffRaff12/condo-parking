-- Seed data for local development only.
-- residents_directory rows are inserted via service role (bypasses RLS).

insert into residents_directory (phone, unit_number, bay_number) values
  ('60123456701', 'A-01', 'P1-01'),
  ('60123456702', 'A-02', 'P1-02'),
  ('60123456703', 'B-01', 'P2-10'),
  ('60123456704', 'B-03', 'P2-12'),
  ('60123456705', 'C-05', 'P3-07');

-- requests rows use null requester_id for seed purposes (no auth users in local seed)
insert into requests (requester_id, unit, name, phone, start_datetime, end_datetime, status) values
  (null, 'A-01', 'Ahmad Zhariff', '60123456701', now() + interval '1 hour',  now() + interval '3 hours',  'open'),
  (null, 'B-01', 'Siti Aminah',   '60123456703', now() - interval '2 hours', now() - interval '30 minutes','resolved'),
  (null, 'C-05', 'Rajan Kumar',   '60123456705', now() - interval '5 hours', now() - interval '4 hours',  'cancelled');
