-- Lets sellers mark the possession date as flexible/negotiable, distinct
-- from "immediate" (both possession_date and possession_flexible null/false)
-- and a specific future date (possession_date set, possession_flexible false).
alter table properties add column if not exists possession_flexible boolean not null default false;
