-- Drop legacy PII columns no longer sent by the client
alter table requests
  drop column unit,
  drop column name,
  drop column phone;

-- Replace owner-only update policy with one that also allows fulfillers
drop policy "requests: owner can update" on requests;

create policy "requests: owner or fulfiller can update"
  on requests for update
  to authenticated
  using (
    requester_id = auth.uid()
    or fulfiller_id = auth.uid()
    or (status = 'open' and fulfiller_id is null)
  );
