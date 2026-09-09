# @nestjslatam/aop.aspects

Ready to use aspects for [`@nestjslatam/aop`](https://www.npmjs.com/package/@nestjslatam/aop).
Port of the `BeyondNet.Aop.Aspects` .NET library.

| Aspect | Token | .NET origin |
| --- | --- | --- |
| `LoggerAspect` | `aop:aspect:logger` | `LoggerAspect` + `LoggerAspectAttribute` |
| `RetryAspect` | `aop:aspect:retry` | `RetryAspect` + `RetryAspectAttribute` |
| `AdviceAspect` | `aop:aspect:advice` | `AdviceAspect` + `AdviceAspectAttribute` |

Also exports `IAopLogger` (the logging sink), `IAdvice` and its default
implementation `Advice`, the `Parameter` / `Result` models, `IMetadata` and
`MetadataHelper`.

## Differences with the .NET version

- `LoggerAspectAttribute.Expression`, evaluated with `System.Linq.Dynamic.Core`,
  is replaced by `resolveRequestId: (args, joinPoint) => string`. It is type
  safe and needs neither `eval` nor an expression parser.
- `LogArguments` takes parameter names in .NET; TypeScript does not keep them at
  runtime, so `logArguments` accepts `true` or a list of parameter indexes.
- `IFactory<T>` disappears: instances are resolved through the NestJS
  `ModuleRef`.
- `RetryAspect` keeps the attempt counter in the invocation context instead of
  in a field of the aspect.
