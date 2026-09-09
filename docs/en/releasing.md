# Releasing

The seven packages are versioned and published with
[Changesets](https://github.com/changesets/changesets) from GitHub Actions.
Nobody publishes from a laptop.

## The flow

```
your branch ──PR──▶ develop ──PR──▶ main ──▶ "chore: version packages" PR ──▶ npm
    │                                 │                                        │
 changeset                     CI green                              published by CI
```

1. **You add a changeset with your change.**

   ```bash
   npm run changeset
   ```

   Pick the affected packages, the bump type and write one line aimed at whoever
   uses the library. The generated file goes in the same commit as your change.

2. **CI checks it.** The `changeset` job fails when a pull request touches a
   published package without declaring a bump. If the change does not need a
   release — docs, tests, CI, the demo app — declare that explicitly:

   ```bash
   npx changeset add --empty
   ```

3. **Merging into `main` opens a version pull request.** The Release workflow
   collects the pending changesets, bumps every affected `package.json`, writes
   the `CHANGELOG.md` of each package and opens `chore: version packages`.

4. **Merging that pull request publishes.** The same workflow runs
   `changeset publish`, which uploads every package whose version is not on npm
   yet, in dependency order, and creates the git tags.

## Bump types

| Type | When |
| --- | --- |
| `patch` | A fix that does not change the API |
| `minor` | A new option, decorator or package, backwards compatible |
| `major` | A breaking change |

Packages are versioned independently. When a package changes, the ones
depending on it get a `patch` automatically, so their internal dependency
ranges stay coherent.

## What CI needs

One secret in the repository:

| Secret | What it is |
| --- | --- |
| `NPM_TOKEN_AOP` | npm automation token with publish rights on the `@nestjslatam` scope |

Create it at npmjs.com → *Access Tokens* → *Generate New Token* → **Automation**,
and add it in *Settings* → *Secrets and variables* → *Actions*. `GITHUB_TOKEN`
is provided by Actions itself.

Every package declares `publishConfig.access: public`, so no extra flag is
needed.

## Empty changesets

An empty changeset satisfies the pull request check, but it is not a release on
its own: the workflow reports `All changesets are empty; not creating PR` and
does nothing. It stays pending until a real changeset arrives, and the version
pull request then consumes both.

That matters only once: an empty changeset sitting in `main` blocks the very
first publication, because the workflow only publishes when nothing is pending.

## The first release

The packages have never been published, so the first run of the workflow with
no pending changesets publishes the versions currently in the repository
(`1.0.0` for the family, `1.1.0` for `@nestjslatam/logreflector-lib`). From then
on every version comes from a changeset.

## Publishing by hand

Only if Actions is unavailable:

```bash
npm run build:libs
npx changeset publish
```

It needs an `npm login` with rights on the scope.
