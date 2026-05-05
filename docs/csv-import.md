# Importing residents_directory via CSV

`residents_directory` is managed by the condo admin only (service role). Residents cannot query it from the client.

## CSV format

```
phone,unit_number,bay_number
60123456701,A-01,P1-01
60123456702,A-02,P1-02
```

Header row required. All three columns are mandatory.

## Steps

1. Prepare your CSV file in the format above.
2. Open the [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Table Editor**.
3. Select the `residents_directory` table.
4. Click **Import data** (top right) → **Upload CSV**.
5. Select your file and confirm the column mapping.
6. Click **Import**. Rows are inserted via service role — RLS is bypassed automatically.

## Notes

- Phone numbers must be in E.164 format without the `+` (e.g. `60123456789`).
- Duplicate rows are not automatically deduplicated — clear the table first if doing a full refresh via **SQL Editor**: `delete from residents_directory;`
- Never expose this table to the anon or authenticated Supabase roles.
