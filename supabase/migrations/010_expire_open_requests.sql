-- Expire open requests whose end_datetime has passed
select cron.schedule(
  'expire-open-requests',
  '*/5 * * * *',
  $$
    update requests
    set status = 'expired'
    where status = 'open'
      and end_datetime < now();
  $$
);
