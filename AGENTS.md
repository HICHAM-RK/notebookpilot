# NotebookPilot Agent Instructions

## Product

NotebookPilot is a browser-native data-science workspace. ChatGPT uses WebMCP site tools exposed by a JupyterLite extension to inspect datasets, propose notebook edits, execute approved cells, compare experiments, and generate reproducibility reports.

The project is inspired by `alliecatowo/jupyterlite-web-mcp`, but it must have its own product identity, architecture decisions, user experience, tests, documentation, and original data-science capabilities. Preserve all required third-party notices for any reused MIT-licensed code.

## Source of truth

Read these documents before changing code:

1. `CAPABILITY_MAP.md` for module boundaries and build order.
2. The applicable `SPEC-<module>.md` for requirements and acceptance criteria.
3. `tasks/plan.md` and `tasks/todo.md` for approved implementation work.
4. `THIRD_PARTY_NOTICES.md` before copying or adapting external code.

If code and an approved specification disagree, update the specification first or stop and surface the conflict.

## Required skills

Use the following Codex skills when their trigger applies:

| Skill | Required when |
|---|---|
| `spec-driven-development` | Starting a module or changing its requirements |
| `planning-and-task-breakdown` | Turning an approved spec into implementation work |
| `incremental-implementation` | Implementing every feature slice |
| `test-driven-development` | Adding or changing behavior |
| `git-workflow-and-versioning` | Making any repository change |
| `api-and-interface-design` | Defining WebMCP tools, TypeScript interfaces, errors, or module boundaries |
| `frontend-ui-engineering` | Building Jupyter panels, diffs, permissions, and status UI |
| `security-and-hardening` | Handling notebooks, datasets, tool calls, execution, paths, or untrusted model output |
| `code-review-and-quality` | Before merging any implementation change |
| `code-simplification` | After behavior is correct when clarity can improve without changing behavior |
| `ponytail` | Default implementation discipline: make the smallest change that fully satisfies the approved spec |
| `browser-testing-with-devtools` | Validating browser behavior and debugging the built UI |
| `observability-and-instrumentation` | Adding tool-call traces, experiment history, diagnostics, or metrics |
| `shipping-and-launch` | Preparing the hosted demo or a release |

There is no installed `graphify` skill. Use Mermaid diagrams in Markdown for architecture, flows, state machines, and trust boundaries. Keep diagrams synchronized with the implementation.

## Development workflow

Follow this sequence for every module:

1. Specify: write or update `SPEC-<module>.md` and obtain approval.
2. Plan: update `tasks/plan.md` and `tasks/todo.md`.
3. Test first: add one meaningful failing test for the next behavior.
4. Implement the smallest vertical slice that passes it.
5. Verify: typecheck, lint, unit tests, then relevant browser tests.
6. Review: run the code-review skill and fix material findings.
7. Simplify: remove needless complexity without changing behavior.
8. Commit one logical change with a conventional commit message.

Do not combine unrelated refactoring and feature behavior in one commit.

## Engineering boundaries

### Always

- Treat notebook content, dataset values, filenames, WebMCP arguments, and model-generated text as untrusted input.
- Validate every WebMCP input at runtime even when a JSON Schema exists.
- Enforce permissions in code; prompts and tool descriptions are never security boundaries.
- Require optimistic concurrency tokens for edits that can overwrite human work.
- Keep agent-created code visible in notebook cells before execution.
- Bound input sizes, output sizes, cell counts, execution time, and returned context.
- Return typed structured errors without stack traces or secrets.
- Provide loading, empty, error, permission, and success states in the UI.
- Preserve keyboard navigation and reduced-motion support.
- Add or update Mermaid diagrams when architecture or trust boundaries change.

### Ask first

- Adding a production backend, database, authentication system, telemetry provider, or paid external service.
- Adding dependencies that execute install scripts or introduce a new runtime.
- Changing the accepted file types or maximum upload sizes.
- Allowing network access, shell commands, package installation, or environment-variable access from notebook execution.
- Reusing substantial code from another project.
- Changing CI, release, or deployment credentials.

### Never

- Commit API keys, tokens, cookies, private datasets, or `.env` files.
- Present original upstream work as authored solely by this project.
- Execute model-generated strings through `eval`, a shell, or hidden kernel paths.
- Add a tool that runs arbitrary invisible code.
- Allow a model or WebMCP tool to change its own permissions.
- Silently overwrite a human edit or truncate a write operation.
- Remove or weaken a failing test to make a build pass.

## Quality gates

Before merge, the affected workspace must pass:

```bash
npm run typecheck
npm run lint:check
npm test
npm run test:e2e
npm run build
```

Commands may be refined in the approved foundation specification. A gate may be skipped only when it is structurally irrelevant to a documentation-only change, and the reason must be recorded in the review summary.

## Definition of done

A feature is done only when:

- It satisfies an approved acceptance criterion.
- Relevant tests demonstrate the behavior and important failure paths.
- Security boundaries are enforced in code.
- User-visible states are complete and accessible.
- Documentation and diagrams match the implementation.
- Review findings are resolved or explicitly recorded.

