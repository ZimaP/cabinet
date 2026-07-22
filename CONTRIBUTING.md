# Contributing to Cabinet

This repository is the shared development project for the parametric 3D cabinet application.

- Repository: https://github.com/ZimaP/cabinet
- Live site: https://zimap.github.io/cabinet/
- Default branch: `main`

## Access

The repository is public, so anyone can view and clone it. To push branches and open work directly from this repository, accept the GitHub collaborator invitation from the repository owner before starting.

## Local setup

Use Node.js 22 or a compatible current Node.js release.

```bash
git clone https://github.com/ZimaP/cabinet.git
cd cabinet
npm ci
npm run dev
```

Open the local URL printed by Vite.

## Development workflow

Do not develop directly on `main`. Start each task from the latest `main` and create a focused branch:

```bash
git switch main
git pull --ff-only origin main
git switch -c feature/short-task-name
```

After making changes, run the complete validation set:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Then commit and push the branch:

```bash
git add .
git commit -m "feat: describe the change"
git push -u origin feature/short-task-name
```

Open a pull request into `main`, explain what changed, and include the validation results. Keep each pull request focused on one feature or fix.

## Project rules

- Preserve the existing parametric cabinet architecture and use the layout calculators as the source of truth.
- Do not resize a complete cabinet assembly with global scaling.
- Keep fixed stock thicknesses, reveals, hardware clearances, and toe-kick dimensions unchanged unless a task explicitly requires otherwise.
- Keep wooden components and hardware as semantic individual parts.
- Do not commit `node_modules`, build output, local environment files, credentials, tokens, or secrets.
- Do not change the GitHub Pages base path or deployment workflow unless the task specifically requires it.
- Test desktop and mobile interaction for viewer changes.
- Pull the latest `main` before starting new work to reduce merge conflicts.

## Deployment

A push or merged pull request to `main` triggers the GitHub Pages workflow. The workflow installs dependencies, runs tests, typechecks, builds the application, and deploys the `dist` output. Confirm that the workflow succeeds and verify the live site after changes are merged.
