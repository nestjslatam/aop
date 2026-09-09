# Publicación

Los siete paquetes se versionan y publican con
[Changesets](https://github.com/changesets/changesets) desde GitHub Actions.
Nadie publica desde su portátil.

## El flujo

```
tu rama ──PR──▶ develop ──PR──▶ main ──▶ PR "chore: version packages" ──▶ npm
   │                              │                                        │
changeset                    CI en verde                        publicado por CI
```

1. **Añades un changeset junto a tu cambio.**

   ```bash
   npm run changeset
   ```

   Eliges los paquetes afectados, el tipo de salto y escribes una línea
   pensando en quien usa la librería. El archivo generado va en el mismo commit
   que tu cambio.

2. **CI lo comprueba.** El job `changeset` falla cuando un pull request toca un
   paquete publicado sin declarar el salto. Si el cambio no necesita release
   —documentación, tests, CI, la app de demo— decláralo explícitamente:

   ```bash
   npx changeset add --empty
   ```

3. **Mergear a `main` abre un pull request de versionado.** El workflow de
   Release recoge los changesets pendientes, sube la versión de cada
   `package.json` afectado, escribe el `CHANGELOG.md` de cada paquete y abre
   `chore: version packages`.

4. **Mergear ese pull request publica.** El mismo workflow ejecuta
   `changeset publish`, que sube cada paquete cuya versión aún no esté en npm,
   en orden de dependencia, y crea los tags de git.

## Tipos de salto

| Tipo | Cuándo |
| --- | --- |
| `patch` | Una corrección que no cambia la API |
| `minor` | Una opción, decorador o paquete nuevo, compatible hacia atrás |
| `major` | Un cambio que rompe |

Los paquetes se versionan de forma independiente. Cuando uno cambia, los que
dependen de él reciben un `patch` automático, para que sus rangos de dependencia
interna sigan siendo coherentes.

## Qué necesita CI

Un secret en el repositorio:

| Secret | Qué es |
| --- | --- |
| `NPM_TOKEN_AOP` | Token de automatización de npm con permiso de publicación en el scope `@nestjslatam` |

Se crea en npmjs.com → *Access Tokens* → *Generate New Token* → **Automation**,
y se añade en *Settings* → *Secrets and variables* → *Actions*. El
`GITHUB_TOKEN` lo aporta Actions.

Cada paquete declara `publishConfig.access: public`, así que no hace falta
ningún flag extra.

## Changesets vacíos

Un changeset vacío satisface la comprobación del pull request, pero no es una
release por sí mismo: el workflow informa `All changesets are empty; not
creating PR` y no hace nada. Queda pendiente hasta que llegue un changeset real,
y entonces el pull request de versionado consume los dos.

Esto solo importa una vez: un changeset vacío en `main` bloquea la primerísima
publicación, porque el workflow solo publica cuando no hay nada pendiente.

## La primera publicación

Los paquetes nunca se han publicado, así que la primera ejecución del workflow
sin changesets pendientes publica las versiones que hay en el repositorio
(`1.0.0` para la familia, `1.1.0` para `@nestjslatam/logreflector-lib`). A
partir de ahí toda versión sale de un changeset.

## Publicar a mano

Solo si Actions no está disponible:

```bash
npm run build:libs
npx changeset publish
```

Requiere un `npm login` con permisos sobre el scope.
