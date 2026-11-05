# Supabase integration verification

Verified during preparation on 30 October 2026:

- **19 automated tests passed** using `npm test`.
- Executed `supabase/setup.sql` in embedded Postgres (PGlite), with Supabase Auth/Storage schema stubs. Verified trigger creation, safe initial role, rejection of direct browser table access, upload ownership policy, private object reads, service-role access, and stale-revision rejection.
- Backend tests cover server identity, owner-only inventory/approvals, borrower restrictions, administrator-only policy updates, unsafe state mutation attempts, malformed inputs, conflict prevention, early check-in rejection, full lifecycle with evidence and inspection, administrator notifications, comment ownership, private drafts, scoped photo visibility, and archived-resource booking history.
- The original eight domain tests also pass, covering fairness, qualification requirements, schedules, quota, incidents, extensions, persistence, and escaping. Browser-local persistence tests apply to the retained reference/demo domain, not cloud connectivity.
- `npm run build` passed. The Edge Function's TypeScript and imported modules bundled successfully using esbuild. JavaScript syntax checks passed.
- Production dependency audit reported **0 vulnerabilities**.
- Chromium UI integration passed: unconfigured setup gate, borrower sign-in, request wizard, reload persistence, sign-out, owner sign-in, approval, refresh, phone-width layout, final sign-out, and zero uncaught browser errors. **Supabase HTTP endpoints were simulated** using the actual command service. This verifies UI wiring but is not live Supabase integration testing.

Deployment checks: the Vercel production sign-in page loads publicly. The Supabase project, backend function, membership trigger, workspace row and private evidence bucket were confirmed present. The backend rejects unauthenticated reads. Hosted email delivery and the full authenticated cloud workflow remain unverified.

To run the optional browser test on your machine:

```sh
npx playwright install chromium
npm run test:browser
```

The browser test uses local fixtures and does not change a cloud project. The database test uses PGlite; no Docker or database credentials are needed for `npm test`.
