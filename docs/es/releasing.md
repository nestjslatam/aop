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

## Tags y releases de GitHub

`changesets/action` decide qué se publicó parseando las líneas `New tag:` de la
salida del publish. `@changesets/cli` 3.x sustituyó esas líneas por un spinner,
así que la acción cree que no se publicó nada y se salta el push de los tags y
la apertura de las releases — mientras que el publish sí funciona. Por eso el
workflow sube los tags y abre una release por tag en pasos propios.

Si alguna vez una publicación no deja tags, se pueden recrear contra el commit
publicado:

```bash
git tag -a "@nestjslatam/aop@1.0.0" <commit> -m "@nestjslatam/aop@1.0.0"
git push origin --tags
```

## Trusted publishing

Los tokens granulares con escritura caducan a los 90 días, y se está retirando
su capacidad de publicar. El reemplazo es el
[trusted publishing](https://docs.npmjs.com/trusted-publishers): npm autentica
al propio workflow por OIDC, sin ningún secreto de por medio.

Solo se puede configurar sobre un paquete que ya existe, así que no era una
opción para la primera publicación. Ahora que los siete están publicados, cada
uno puede declarar este repositorio como su trusted publisher, en
`npmjs.com/package/<nombre>/access`:

| Campo | Valor |
| --- | --- |
| Organization or user | `nestjslatam` |
| Repository | `aop` |
| Workflow filename | `release.yml` |
| Environment | dejar vacío |

El workflow ya lleva el permiso `id-token: write` y actualiza npm a una versión
que soporta OIDC, así que no hay nada más que tocar. npm prefiere OIDC cuando
está disponible y cae al token cuando no, lo que hace segura la migración
paquete a paquete.

Cuando los siete lo declaren, se pueden eliminar `NODE_AUTH_TOKEN` y el secret
`NPM_TOKEN_AOP`.

## Publicar a mano

Solo si Actions no está disponible:

```bash
npm run build:libs
npx changeset publish
```

Requiere un `npm login` con permisos sobre el scope.
