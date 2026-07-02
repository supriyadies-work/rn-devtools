# Contributing

Thanks for your interest in contributing to **Supr - Devtools**.

## Golden rule: no changes without a Merge Request

Direct pushes to `main` are **not allowed**. Every change — code, docs, config — must go through a Pull Request (Merge Request).

The `main` branch is protected on GitHub with:

- Pull request required before merging.
- At least **1 approving review**.
- Stale approvals dismissed on new commits.
- All review conversations must be resolved before merge.
- Linear history required (no merge commits — use squash/rebase).
- Force pushes and branch deletion disabled.

## Workflow

1. Create a branch from the latest `main`:
   ```bash
   git checkout main && git pull
   git checkout -b <type>/<short-slug>
   ```
   Branch types: `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`.

2. Make your changes and commit with a clear, conventional message
   (e.g. `feat: add deep link presets`).

3. Push your branch and open a Pull Request against `main`:
   ```bash
   git push -u origin HEAD
   gh pr create --base main
   ```

4. Request review, resolve all conversations, and wait for at least one
   approval. Merge is only possible once the PR passes protection checks.

## Before opening a PR

- Keep changes focused and scoped to a single concern.
- Update `README.md` when public API or configuration changes.
- Do not commit secrets, tokens, or host-specific/private data.

## Reporting issues

Open a GitHub Issue with clear reproduction steps, expected vs actual
behavior, and library version.
