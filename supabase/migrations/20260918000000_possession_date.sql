-- Lets sellers indicate when a property will actually be available
-- (immediate = null, or a specific future date), so buyers/renters with a
-- specific timeline can filter themselves in or out.
alter table properties add column if not exists possession_date date;
