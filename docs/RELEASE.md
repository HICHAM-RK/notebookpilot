# Hosted release guide

Status: prepared, not deployed. The repository owner must approve a host and whether the demo is public before E3 can complete.

## Release decision record

Complete this record before configuring or publishing a hosting service:

- Host:
- Visibility: public or access-controlled
- Public URL:
- Approved by and date:
- Commit SHA:
- Release artifact workflow run:
- Rollback commit SHA:

The recommended public-demo option is a static host that can set response headers, such as Cloudflare Pages. GitHub Pages alone is not the default recommendation because it does not provide repository-controlled arbitrary response headers. Do not add a paid plan, domain, analytics, credentials or third-party data service without separate owner approval.

## Privacy model

NotebookPilot is a static, browser-native application. Uploaded datasets, notebook state, approvals and experiment records stay in the browser unless the human explicitly downloads an export. The application has no NotebookPilot backend and does not upload dataset contents to the static host. The host and normal network intermediaries can still observe ordinary request metadata such as IP address, user agent, requested assets and timestamps. The native AI host receives only information exposed by the selected notebook/cell/dataset permissions.

A public deployment makes the application and bundled repository-owned sample content publicly accessible. It must not contain private datasets, credentials, personal notebook content or private repository metadata.

## Hosting requirements

Deploy the complete `_output/` directory from one verified commit. The host must provide:

- HTTPS with no mixed content.
- Correct JavaScript, WebAssembly, JSON, notebook and worker MIME types.
- `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` on application routes, including error responses.
- Working module workers, WebAssembly, range/static-asset requests and JupyterLite service-worker scope.
- A stable base path. If hosted below a subdirectory, build and test with that exact base URL rather than rewriting routes after build.
- Cache invalidation on each release so the service worker, extension bundle and application shell cannot come from different commits.
- No HTML injection, asset transformation or analytics scripts unless separately reviewed and approved.

## Build a release artifact

Run the GitHub Actions `Release artifact` workflow manually for the selected commit. It performs the frozen dependency install, lint, typecheck, unit checks, production build, high-severity dependency gate and complete Chromium suite. It then uploads the `_output/` site as a GitHub Actions artifact. Download that artifact and deploy its contents without modification.

The workflow does not publish, configure a host, request credentials or change repository visibility.

## Pre-release checks

Before deployment:

1. Fill in the decision record and confirm the commit is the intended release.
2. Re-run the dependency audits documented in `docs/REVIEW.md`; triage every new high/critical result and re-evaluate the tracked moderate renderer advisories.
3. Confirm the artifact workflow completed all checks for the same commit SHA.
4. Inspect the artifact for secrets and private data.
5. Keep `LICENSE` and `THIRD_PARTY_NOTICES.md` available from the repository linked by the demo.

After deployment, verify against the public URL—not a local substitute:

1. Record the deployed commit and response headers.
2. Load the application in a fresh browser profile over HTTPS and confirm the extension, Pyodide worker, sample notebook and static assets work without console errors.
3. Run the full native-host journey in `docs/HOST_VERIFICATION.md`: discover exactly 13 tools, read an unsaved allowed cell, deny one proposal with no mutation, accept another proposal without execution, separately approve execution and observe real Python output.
4. Confirm hidden notebook/cell content is absent, default execution is denied and malformed approval fields are rejected.
5. Upload the repository-owned CSV fixture, profile it, prepare and explicitly download a report, and verify no dataset rows are sent by default.
6. Re-run the hosted browser smoke tests against the deployed base URL if the hosting configuration differs from local root hosting.

E3 is complete only when this evidence is recorded in `docs/VERIFICATION.md` and `tasks/todo.md` for the exact deployed commit.

## Backup and rollback

Before release, retain the previous verified artifact and commit SHA. Notebook, experiment and report data is browser-local; users should explicitly export anything they need before clearing site data or changing origins.

If a release fails:

1. Stop promotion of the failing artifact.
2. Redeploy the previous verified artifact unchanged.
3. Purge the host cache for the failed version.
4. In affected browsers, unregister the NotebookPilot service worker and clear site data only after exporting needed notebooks and records; this erases browser-local state.
5. Re-run the HTTPS/header, worker and native-host smoke journey on the restored URL.
6. Record the failed/restored SHAs, reason, timestamps and verification outcome.

Changing the site origin is not a transparent rollback: browser-local state is origin-scoped and will not automatically follow the new URL.

## Attribution

Preserve the project license, copyright notices and `THIRD_PARTY_NOTICES.md`. A hosted demo should link to the repository and identify NotebookPilot as the project name. Do not imply endorsement by Jupyter, Pyodide, OpenAI, ChatGPT, Google Colab or other upstream projects.
