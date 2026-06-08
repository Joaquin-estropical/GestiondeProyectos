# Skill: /audit

Perform a full code + Supabase data audit for this project.

## Steps

1. **Cross-check components vs DB schema**
   - For each major entity (members, projects, tasks, areas), confirm the TypeScript types match the Supabase table columns.
   - Flag any field used in code that doesn't exist in the schema, or any DB column never read by the frontend.

2. **Flag hardcoded mock data**
   - Search the codebase for hardcoded arrays or objects that shadow real DB data (e.g., `TEAM`, `MOCK_MEMBERS`, static lists of users/projects).
   - Confirm each component that displays live data actually calls `fetchX()` or reads from Zustand store — not from a local constant.

3. **Reconcile against contract/reference docs** (if provided)
   - If the user supplies PDFs, DOCX, or addenda, parse the key facts (amounts, parties, dates, roles) and diff them against what's stored in Supabase.
   - Quote the exact passage that justifies each fix before applying it.
   - Flag ambiguous cases (e.g., base contract vs addendum conflict) for human review rather than guessing.

4. **Output findings + idempotent SQL fix script**
   - Produce a numbered findings list: severity (🔴 critical / 🟡 warning / 🟢 info), affected file or table, and the specific mismatch.
   - For each finding that requires a DB change, generate an idempotent SQL snippet (`INSERT ... ON CONFLICT DO NOTHING`, `UPDATE ... WHERE`, etc.) that can be re-run safely.
   - Group SQL snippets into a single script at the end of the report.

## Output format

```
## Audit Report — <date>

### Findings
1. 🔴 [members] hardcoded TEAM array in SettingsPage.tsx ignores DB — use fetchMembers()
2. 🟡 [tasks] `assigned_to` field in DB not reflected in TaskCard component
...

### SQL Fix Script
-- Idempotent — safe to re-run
INSERT INTO members (id, name, role, short) VALUES (...)
ON CONFLICT (id) DO NOTHING;
...
```
