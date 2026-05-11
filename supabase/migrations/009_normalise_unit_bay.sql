-- Migration 009: Normalise unit_number and bay_number to canonical formats.
--
-- Target formats:
--   unit_number: [12]-(G|NN)-NN  e.g. 2-G-03, 1-10-16
--   bay_number:  (LG|G|L1)-NNN   e.g. LG-030, G-352, L1-364
--
-- Rows that cannot be auto-fixed are left unchanged and excluded from the
-- NOT VALID constraints below. They must be corrected manually before running
-- VALIDATE CONSTRAINT.

-- ── Unit numbers ─────────────────────────────────────────────────────────────

-- Fix units where floor segment is G (case-insensitive) — pad unit to 2 digits.
UPDATE residents_directory
SET unit_number = (
  split_part(unit_number, '-', 1) || '-G-' ||
  lpad(split_part(unit_number, '-', 3), 2, '0')
)
WHERE unit_number ~* '^[12]-[Gg]-[0-9]+$';

-- Fix units where floor is numeric — pad both floor and unit to 2 digits.
UPDATE residents_directory
SET unit_number = (
  split_part(unit_number, '-', 1) || '-' ||
  lpad(split_part(unit_number, '-', 2), 2, '0') || '-' ||
  lpad(split_part(unit_number, '-', 3), 2, '0')
)
WHERE unit_number ~ '^[12]-[0-9]+-[0-9]+$';

-- ── Bay numbers ──────────────────────────────────────────────────────────────

-- Add dash after prefix when missing: LG030 → LG-030, L1364 → L1-364, G352 → G-352.
UPDATE residents_directory
SET bay_number = regexp_replace(bay_number, '^(LG|L1|G)([0-9]+)$', '\1-\2')
WHERE bay_number ~* '^(LG|L1|G)[0-9]+$';

-- Replace space separator with dash: LG 16 → LG-16.
UPDATE residents_directory
SET bay_number = regexp_replace(bay_number, '^(LG|L1|G)\s+([0-9]+)$', '\1-\2')
WHERE bay_number ~* '^(LG|L1|G)\s+[0-9]+$';

-- Zero-pad number to 3 digits: LG-60 → LG-060, G-7 → G-007.
UPDATE residents_directory
SET bay_number = (
  split_part(bay_number, '-', 1) || '-' ||
  lpad(split_part(bay_number, '-', 2), 3, '0')
)
WHERE bay_number ~* '^(LG|L1|G)-[0-9]{1,2}$';

-- ── Constraints (NOT VALID — apply to new rows only; skip existing dirty rows) ──

ALTER TABLE residents_directory
  ADD CONSTRAINT unit_number_format
  CHECK (unit_number ~ '^[12]-(G|[0-9]{2})-[0-9]{2}$')
  NOT VALID;

ALTER TABLE residents_directory
  ADD CONSTRAINT bay_number_format
  CHECK (bay_number ~ '^(LG|L1|G)-[0-9]{3}$')
  NOT VALID;

-- After manually fixing any remaining rows (bare numbers like 130, 245, or
-- unknown prefixes like B2), run these to enforce constraints on all rows:
--
--   ALTER TABLE residents_directory VALIDATE CONSTRAINT unit_number_format;
--   ALTER TABLE residents_directory VALIDATE CONSTRAINT bay_number_format;
