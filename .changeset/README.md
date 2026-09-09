# Changesets

Every change that should reach npm needs a changeset: a small file describing
what changed and how each package's version must move.

```bash
npm run changeset
```

Pick the affected packages, the bump type and write one line for the user of
the library. Commit the generated file with your change.

- **patch** — a fix that does not change the API.
- **minor** — a new option, decorator or package, backwards compatible.
- **major** — a breaking change.

You do not need one for changes that never reach the published packages:
documentation, tests, CI or the demo app in `src/`.

Merging into `main` opens a "chore: version packages" pull request with the new
versions and changelogs. Merging that PR publishes to npm.

See [`docs/en/releasing.md`](../docs/en/releasing.md).
