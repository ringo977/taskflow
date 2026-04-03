# Migration Invariants

This document captures the dependencies and ordering constraints between
Supabase migrations.  Update it whenever a new migration introduces a
hard ordering requirement.  The `scripts/migration-lint.js` tool enforces
the ordering invariants listed below automatically in CI.

---

## Authoritative columns

| Table      | Column           | Added in | Replaces / notes                              |
|------------|------------------|----------|-----------------------------------------------|
| `tasks`    | `assignee_ids`   | `025`    | UUID array; replaces legacy `assignee_name`   |
| `tasks`    | `creator_id`     | `025`    | UUID of the user who created the task         |
| `comments` | `author_id`      | `025`    | UUID of the comment author; used by RLS       |

## Dropped columns

| Table      | Column          | Dropped in | Why                                            |
|------------|-----------------|------------|------------------------------------------------|
| `tasks`    | `assignee_name` | `027`      | Replaced by `assignee_ids` + profiles join     |

**After a column is dropped:** any `.select()` that names it explicitly
returns a PostgREST 400.  Run `npm run migration:lint` to catch references.

---

## Ordering constraints

These must be satisfied in the migration sequence.
Violations are caught by `npm run migration:lint`.

### `025` → `027`
`025_user_id_fields.sql` adds `assignee_ids uuid[]` to `tasks` and
`author_id uuid` to `comments`.
`027_drop_assignee_name.sql` drops `tasks.assignee_name`.
**027 must come after 025** so that the UUID-based columns are already
present and populated before the legacy column is removed.

### `025` → `028`
`028_comments_author_policy.sql` drops and re-creates the `comments`
UPDATE/DELETE RLS policies using `author_id = auth.uid()`.
**028 must come after 025** because `author_id` does not exist before 025.

### `026` → `027`
`026_audit_log.sql` creates the `audit_log` table and associated triggers.
**027 must come after 026** to ensure audit triggers remain intact when
`assignee_name` is removed.

---

## Indexes

Indexes are spread across several migrations. Summary of all explicit indexes:

| Migration | Index | Table.Column(s) | Type |
|-----------|-------|------------------|------|
| `014` | `idx_tasks_not_deleted` | `tasks(org_id) WHERE deleted_at IS NULL` | Partial B-tree |
| `014` | `idx_projects_not_deleted` | `projects(org_id) WHERE deleted_at IS NULL` | Partial B-tree |
| `014` | `idx_portfolios_not_deleted` | `portfolios(org_id) WHERE deleted_at IS NULL` | Partial B-tree |
| `025` | `idx_tasks_assignee_ids` | `tasks(assignee_ids)` | GIN |
| `025` | `idx_comments_author_id` | `comments(author_id)` | B-tree |
| `026` | `idx_audit_log_org_time` | `audit_log(org_id, created_at)` | B-tree |
| `026` | `idx_audit_log_entity` | `audit_log(entity_type, entity_id)` | B-tree |
| `026` | `idx_audit_log_user` | `audit_log(user_id)` | B-tree |
| `029` | `idx_subtasks_task_id` | `subtasks(task_id)` | B-tree |
| `029` | `idx_subtasks_org_id` | `subtasks(org_id)` | B-tree |
| `029` | `idx_comments_task_id` | `comments(task_id)` | B-tree |
| `029` | `idx_comments_org_id` | `comments(org_id)` | B-tree |
| `029` | `idx_task_dependencies_task_id` | `task_dependencies(task_id)` | B-tree |
| `029` | `idx_task_dependencies_org_id` | `task_dependencies(org_id)` | B-tree |
| `029` | `idx_sections_org_project` | `sections(org_id, project_id)` | Composite B-tree |
| `029` | `idx_tasks_project_id` | `tasks(project_id)` | B-tree |
| `029` | `idx_project_members_project_id` | `project_members(project_id)` | B-tree |

---

## Schema cache note

After any `DROP COLUMN` migration is applied to a hosted Supabase project,
the PostgREST schema cache must be refreshed before queries succeed.  Run
the following in the Supabase SQL Editor:

```sql
NOTIFY pgrst, 'reload schema';
```

If queries still return 400s after applying the migration, wait 30 seconds
and retry; or restart the PostgREST service from the Supabase dashboard.

---

## Adding a new invariant

1. Add the human description to this file under "Ordering constraints".
2. Add a matching entry to the `ORDERING_INVARIANTS` array in
   `scripts/migration-lint.js`.
3. Verify with `npm run migration:lint`.
