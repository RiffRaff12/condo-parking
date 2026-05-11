-- Automated cleanup: delete completed/cancelled/expired requests older than 30 days
-- Satisfies PDPA data minimisation requirement (see Dasar Privasi §7)
select cron.schedule(
  'delete-old-requests',
  '0 3 * * *',
  $$
    delete from requests
    where status in ('resolved', 'cancelled', 'expired')
      and created_at < now() - interval '30 days';
  $$
);
