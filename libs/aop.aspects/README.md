# @nestjslatam/aop.aspects

Aspectos listos para usar sobre
[`@nestjslatam/aop`](https://www.npmjs.com/package/@nestjslatam/aop).
Port de la librería .NET `BeyondNet.Aop.Aspects`.

| Aspecto | Token | Origen .NET |
| --- | --- | --- |
| `LoggerAspect` | `aop:aspect:logger` | `LoggerAspect` + `LoggerAspectAttribute` |
| `RetryAspect` | `aop:aspect:retry` | `RetryAspect` + `RetryAspectAttribute` |
| `AdviceAspect` | `aop:aspect:advice` | `AdviceAspect` + `AdviceAspectAttribute` |

También exporta `IAopLogger` (el sink de logging), `IAdvice` y su
implementación por defecto `Advice`, los modelos `Parameter` / `Result`,
`IMetadata` y `MetadataHelper`.

## Diferencias con la versión .NET

- `LoggerAspectAttribute.Expression`, que se evaluaba con
  `System.Linq.Dynamic.Core`, se sustituye por
  `resolveRequestId: (args, joinPoint) => string`. Es type-safe y no necesita
  `eval` ni un parser de expresiones.
- `LogArguments` recibe nombres de parámetro en .NET; TypeScript no los conserva
  en runtime, así que `logArguments` acepta `true` o una lista de índices.
- `IFactory<T>` desaparece: las instancias se resuelven con el `ModuleRef` de
  NestJS.
- `RetryAspect` guarda el contador de intentos en el contexto de la invocación y
  no en un campo del aspecto.

## Documentación

[Manual de uso](https://github.com/nestjslatam/aop/blob/main/docs/es/usage.md) ·
[Guía How-To](https://github.com/nestjslatam/aop/blob/main/docs/es/how-to.md)

## Licencia

MIT
