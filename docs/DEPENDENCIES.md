# Dependency decisions

## Extension foundation, 2026-10-23

Use the JupyterLab 4.6.4 application/notebook packages and apputils 4.7.4 to match the metadata shipped by locked JupyterLite 0.8.5. React 18.3.1 is shared with that host. The prebuilt extension consumes host singleton packages rather than bundling another application. The builder is 4.5.11 (4.6.4 was unavailable in the registry); compatibility is established by building and activating the output in the real JupyterLite application, not by assuming matching version strings.

TypeScript is pinned to 5.9.3 because ts-jest 29.4.15 requires TypeScript >=4.3 and <7. The previous 7.0.2 foundation version cannot satisfy that peer contract. Jest 30.5.2 and the adapter are locked; no --force or --legacy-peer-deps used. npm installs continue to use --ignore-scripts.

## Audit findings requiring release follow-up

The extension dependency tree currently reports 21 advisory entries (3 low, 18 moderate), propagated from two leaf packages: KaTeX and sanitize-html. No high/critical findings were reported. This is not equivalent to a safe release. The application uses JupyterLite's prebuilt host renderers, so changing an npm resolution alone would not establish that the hosted renderer is patched.

- KaTeX prototype-pollution-dependent trust bypass: [GHSA-238p-pmpm-9mq7](https://github.com/advisories/GHSA-238p-pmpm-9mq7).
- sanitize-html URI/markup validation advisories: [GHSA-vccv-cmxp-4j9h](https://github.com/advisories/GHSA-vccv-cmxp-4j9h), [GHSA-g8qq-57p8-ggw5](https://github.com/advisories/GHSA-g8qq-57p8-ggw5), [GHSA-jxwj-j7wr-gfrw](https://github.com/advisories/GHSA-jxwj-j7wr-gfrw), [GHSA-x3q4-9hxx-gx8m](https://github.com/advisories/GHSA-x3q4-9hxx-gx8m), [GHSA-cv27-6wvh-8x7j](https://github.com/advisories/GHSA-cv27-6wvh-8x7j).

Before D3 imported-output handling and E3 hosting, inspect the actual bundled renderer versions, update the compatible host distribution where necessary, and run malicious-rendering regression cases. Do not accept npm audit's suggested downgrade of Jupyter packages to 0.18.x; that would replace the application architecture. Keep the current demo limited to repository-owned fixtures while these gates are open. Do not suppress advisories or describe the moderate threshold as a security approval.
