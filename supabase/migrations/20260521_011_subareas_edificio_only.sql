-- 20260521_011_subareas_edificio_only.sql
-- Sub-areas now only apply to the "edificio" area.
-- 1) Clear projects.subarea for non-edificio projects.
-- 2) Delete sub-areas of non-edificio areas (no longer used).
-- 3) Allow projects.subarea to be NULL (was NOT NULL after migration 010).

UPDATE projects
SET    subarea = NULL
WHERE  area <> 'edificio';

DELETE FROM subareas WHERE area <> 'edificio';

ALTER TABLE projects ALTER COLUMN subarea DROP NOT NULL;
