-- Extract endpoint as its own column for per-device indexing
alter table push_subscriptions
  add column endpoint text;

update push_subscriptions
  set endpoint = subscription_json->>'endpoint';

alter table push_subscriptions
  alter column endpoint set not null;

-- Replace single-user unique constraint with per-device composite key
alter table push_subscriptions
  drop constraint push_subscriptions_user_id_key;

alter table push_subscriptions
  add constraint push_subscriptions_user_id_endpoint_key unique (user_id, endpoint);
