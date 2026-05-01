# Database Order

Apply the SQL files in this order for a fresh environment:

1. `schema.sql`
2. `ai-schema.sql`
3. `schema-extensions.sql`
4. `reporting-views.sql`
5. `rls-policies.sql`
6. `ai-rls.sql`
7. `rls-extensions.sql`

`schema-extensions.sql` adds the operational tables, safe sequence RPC wrapper, and trigger helpers that the app routes already depend on.
