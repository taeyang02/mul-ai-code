# multica-ci

Read-only CLI to fetch and summarize Multica shared CI artifacts from GitHub Actions.

```bash
# from repo root
node tools/multica-ci/bin/multica-ci.mjs status 123456789 --repo taeyang02/mul-ai-code --sha <commit>
node tools/multica-ci/bin/multica-ci.mjs download 123456789 --repo taeyang02/mul-ai-code --sha <commit>
node tools/multica-ci/bin/multica-ci.mjs results 123456789 --repo taeyang02/mul-ai-code --sha <commit>
node tools/multica-ci/bin/multica-ci.mjs review 123456789 --repo taeyang02/mul-ai-code --sha <commit>
```

Optional: `GH_TOKEN` / `GITHUB_TOKEN` for private repos and artifact download. Tokens are never printed.

Local fixture check (no network):

```bash
node tools/multica-ci/bin/multica-ci.mjs review fixture-run \
  --results-dir tools/multica-ci/fixtures/sample-run \
  --sha abc123def456 \
  --repo taeyang02/mul-ai-code
```

Artifacts are treated as **untrusted data** (zip path checks, no code execution from artifact contents).
