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

## Tags and GitHub releases

`changesets/action` decides what shipped by parsing `New tag:` lines out of the
publish output. `@changesets/cli` 3.x replaced those lines with a spinner, so
the action believes nothing was published and skips pushing the tags and
opening the releases — while the publish itself succeeds. The workflow
therefore pushes the tags and opens one release per tag in its own steps.

If a release ever publishes without leaving tags behind, they can be recreated
against the released commit:

```bash
git tag -a "@nestjslatam/aop@1.0.0" <commit> -m "@nestjslatam/aop@1.0.0"
git push origin --tags
```

## Trusted publishing

Granular tokens with write access expire after 90 days, and their ability to
publish is being retired. The replacement is
[trusted publishing](https://docs.npmjs.com/trusted-publishers): npm
authenticates the workflow itself through OIDC, with no secret involved.

It can only be configured for a package that already exists, so it was not an
option for the first release. Now that the seven packages are published, each
one can declare this repository as its trusted publisher, at
`npmjs.com/package/<name>/access`:

| Field | Value |
| --- | --- |
| Organization or user | `nestjslatam` |
| Repository | `aop` |
| Workflow filename | `release.yml` |
| Environment | leave empty |

The workflow already carries the `id-token: write` permission and updates npm
to a version that supports OIDC, so nothing else changes. npm prefers OIDC when
it is available and falls back to the token otherwise, which makes the
migration package by package safe.

Once all seven declare it, `NODE_AUTH_TOKEN` and the `NPM_TOKEN_AOP` secret can
be removed.

## Publishing by hand

Only if Actions is unavailable:

```bash
npm run build:libs
npx changeset publish
```

It needs an `npm login` with rights on the scope.
