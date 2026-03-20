-- PostgREST fallisce con 3F000 (invalid_schema_name) se la sua config include
-- schemi che non esistono ancora nel DB. I log mostrano:
--   db-schemas=public,graphql_public,biomimx,polimi
-- Esegui questo in: Dashboard → SQL → New query → Run.
-- L'app usa le tabelle in `public` con org_id; questi schemi possono restare vuoti.

CREATE SCHEMA IF NOT EXISTS polimi;
CREATE SCHEMA IF NOT EXISTS biomimx;
