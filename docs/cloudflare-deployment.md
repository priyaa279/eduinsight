# Cloudflare Workers deployment

EduInsight is publicly deployed through the verified Vinext, Vite, and
Cloudflare Workers build path.

**Public demo:**
[https://eduinsight-ai.eduinsight-demo.workers.dev](https://eduinsight-ai.eduinsight-demo.workers.dev)

The public deployment is read-only. Data Quality lifecycle mutations and IPEDS
approval mutations are rejected on public hostnames.

## Deployment contract

- Worker: `eduinsight-ai`
- Runtime compatibility date: `2026-05-15`
- Runtime compatibility flag: `nodejs_compat`
- D1 binding: `DB`
- D1 database: `eduinsight-demo-db`
- D1 migrations: `drizzle/`
- R2 binding: `ARTIFACTS`
- R2 bucket: `eduinsight-demo-artifacts`
- Public hostname: `eduinsight-ai.eduinsight-demo.workers.dev`

The D1 database stores durable Data Quality lifecycle/audit records and IPEDS
approval records. R2 is reserved for approved review artifacts. Governed source
files and generated analytical artifacts remain part of the application data
pipeline rather than being represented as D1 workflow state.

Cloudflare resource identifiers in `wrangler.jsonc` are deployment coordinates,
not credentials. Secrets must never be placed in that file; local credentials
belong in ignored `.dev.vars` files or Cloudflare-managed authentication.

## Verified deployment sequence

From the repository root:

```bash
npm ci
npm run verify:release
npm run build
npm run check:deployment-config
npm run preview:worker
npm run deploy:worker
```

`deploy:worker` validates the reviewed source and generated Worker configuration
before deploying `dist/server/wrangler.json`. It does not migrate frameworks or
change the Worker name.

Apply existing D1 migrations only when a new database is provisioned or a new
reviewed migration is introduced:

```bash
npx wrangler d1 migrations apply eduinsight-demo-db --remote --config wrangler.jsonc
```

Do not seed the public-demo database with local Data Quality lifecycle history,
reviewer notes, audit events, or IPEDS approvals. Do not upload local IPEDS
artifacts to the public bucket as part of ordinary deployment.

## Post-deployment verification

After deployment:

1. Open the exact `workers.dev` HTTPS URL.
2. Exercise all six modules and representative Ask outcomes.
3. Confirm CSS, JavaScript, fonts, and API reads load without runtime errors.
4. Confirm public Data Quality PATCH and IPEDS approval POST requests return
   `403` with the `public-demo-read-only` contract.
5. Recheck that public smoke testing created no D1 lifecycle/audit/approval rows
   and no R2 objects.

EduInsight does not submit IPEDS data to NCES. The IPEDS Center prepares,
validates, and presents review artifacts within explicit source-readiness and
human-approval boundaries.

## Rollback

Cloudflare retains Worker version history. If a public smoke check fails, roll
back to the last verified version, diagnose locally, rerun the release and
deployment guards, then deploy a new version. Do not repair a deployment by
changing governed source values or copying local workflow state into the public
database.
