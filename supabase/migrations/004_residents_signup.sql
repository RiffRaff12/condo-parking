alter table residents_directory
  add column name  text not null default '',
  add column email text not null default '';

alter table residents_directory
  alter column name  drop default,
  alter column email drop default;

alter table residents_directory
  add constraint residents_directory_phone_unit_bay_unique
  unique (phone, unit_number, bay_number);

create table pending_signups (
  id           uuid        primary key default gen_random_uuid(),
  name         text        not null,
  email        text        not null,
  phone        text        not null,
  unit_number  text        not null,
  bay_number   text        not null,
  otp_code     text        not null,
  expires_at   timestamptz not null,
  created_at   timestamptz not null default now()
);
