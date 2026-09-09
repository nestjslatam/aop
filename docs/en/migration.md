# Migration from BeyondNet.Aop (.NET) to NestJS

This document records how each concept of the `BeyondNet.Aop` .NET solution was
ported, which package it lives in and what its final name is.

The rule that drove every decision: **do not reimplement what NestJS already
provides**. Where NestJS has a native mechanism, the native mechanism wins even
if the .NET library had its own.

## Package map

| .NET project | Package | Folder |
| --- | --- | --- |
| `BeyondNet.Aop` | `@nestjslatam/aop` | `libs/aop` |
| `BeyondNet.Aop.Aspects` | `@nestjslatam/aop.aspects` | `libs/aop.aspects` |
| `BeyondNet.Aop.Aspects.Logger` | `@nestjslatam/aop.aspects.logger` | `libs/aop.aspects.logger` |
| `BeyondNet.Aop.Aspects.Logger.Serilog` | `@nestjslatam/aop.aspects.logger.pino` | `libs/aop.aspects.logger.pino` |
| `BeyondNet.Aop.DispatchProxy` + `...DependencyInjection.Aspects.Installer` | `@nestjslatam/aop.nestjs` | `libs/aop.nestjs` |
| — (new) | `@nestjslatam/aop.aspects.telemetry` | `libs/aop.aspects.telemetry` |
| — (v1 compatibility) | `@nestjslatam/logreflector-lib` | `libs/logger` |

The logical name of the family is `nestjslatam.aop`, `nestjslatam.aop.aspects`,
`nestjslatam.aop.aspects.logger`, `nestjslatam.aop.aspects.logger.pino` and
`nestjslatam.aop.nestjs`. The npm scope
already carries `nestjslatam`, so the package name does not repeat it.

## Concept map

| .NET concept | NestJS equivalent | Decision | Package | Final name |
| --- | --- | --- | --- | --- |
| `IJoinPoint` / `JoinPoint` | none (`ExecutionContext` only covers handlers) | port | `aop` | `IJoinPoint` / `JoinPoint` |
| `MethodInfo`, `TargetType` | `Reflect` + `design:paramtypes` | adapt | `aop` | `IMethodInfo` |
| `IPointCut` / `PointCut` | `SetMetadata` + `Reflector` | adopt native | `aop` | `IPointCut` / `AspectPointCut` |
| `IAspectExecutor` / `AspectExecutor` | none | port | `aop` | `IAspectExecutor` / `AspectExecutor` |
| `AbstractAspect<T>` | decorators + metadata | port | `aop` | `BaseAspect` |
| `BaseAspectAttribute.Order` | decorator options | adapt | `aop` | `IAspectOptions.order` |
| `OnMethodBoundaryAspect<T>` | none | port | `aop` | `OnMethodBoundaryAspect` |
| `OnRetryAspect<T>` | RxJS retry operators | adapt | `aop` | `OnRetryAspect` |
| `SetNext` / `GetNext` | interceptor composition | adapt | `aop` | `AspectNext` |
| `AopProxy` / `AopProxyCreator` (`DispatchProxy`) | `NestInterceptor` + descriptor wrapping | adopt native + adapt | `aop.nestjs` | `AopInterceptor` + decorators |
| `ServiceCollectionExtension.AddAop()` | `DynamicModule` | adopt native | `aop.nestjs` | `AopModule.forRoot/forRootAsync` |
| `IAopAspectsBuilder` / `AopAspectsBuilder` | providers | adapt | `aop.nestjs` | `IAopAspectsBuilder` / `AopAspectsBuilder` |
| `AddKeyedTransient` (keyed DI) | class token + `ModuleRef` | adapt | `aop.nestjs` | — |
| `IFactory<T>` / `Factory<T>` | `ModuleRef` | adopt native | — | removed |
| `IEvaluator` / `Evaluator` | none without `eval` | replace | `aop.aspects` | `ILoggerAspectOptions.resolveRequestId` |
| `LoggerAspect` + `LoggerAspectAttribute` | — | port | `aop.aspects` / `aop.nestjs` | `LoggerAspect` / `@LogMethod` |
| `RetryAspect` + `RetryAspectAttribute` | — | port | `aop.aspects` / `aop.nestjs` | `RetryAspect` / `@Retry` |
| `AdviceAspect` + `AdviceAspectAttribute` | — | port | `aop.aspects` / `aop.nestjs` | `AdviceAspect` / `@UseAdvice` |
| `IAdvice` / `Advice` | — | port | `aop.aspects` | `IAdvice` / `Advice` |
| `Argument` / `Return` | — | adapt to the existing models | `aop.aspects` | `Parameter` / `Result` |
| `ILogger` (six `OnExit` overloads) | — | adapt to four phases | `aop.aspects` | `IAopLogger` |
| `ISerializer` | — | already existed | `aop.aspects.logger` | `ISerializer` |
| `JsonSerializer` | — | port | `aop.aspects.logger` | `JsonSerializer` |
| `SensitiveDataJsonSerializer` + `SensitiveDataResolver` + `SensitiveDataValueProvider` | `JSON.stringify` replacer | port, collapsed into one type | `aop.aspects.logger` | `SensitiveDataJsonSerializer` |
| `XmlSerializer` / `DataContractSerializer` | none without a new dependency | not ported | — | — |
| `CommonLoggingLogger` | `Logger` from `@nestjs/common` | adopt native | `aop.aspects.logger` | `NestLoggerSink` |
| `SerilogLogger` | pino | port | `aop.aspects.logger.pino` | `PinoSink` |
| `Stopwatch` | `Date.now()` | adapt | `aop` | `IJoinPoint.elapsedMs` |

## Decisions

### D1 — `DispatchProxy` is not replicated

.NET builds a dynamic proxy per interface. NestJS has two native interception
points and the port uses both:

- **Descriptor wrapping** (`@LogMethod`, `@Retry`, `@UseAdvice`): works on any
  method, of a provider, a controller or a resolver. This is the default.
- **`AopInterceptor`**: for handlers declared with `useInterceptor: true`, where
  the `ExecutionContext` carries transport data such as the `x-request-id`
  header.

Interception through `DiscoveryService` plus instance proxying was discarded: it
breaks `this`, complicates request scoped providers and adds nothing to the goal
of decorating methods.

The interceptor skips handlers already wrapped by a decorator, so nothing is
ever logged twice.

### D2 — `Evaluator` is replaced by a function

`LoggerAspectAttribute.Expression` is a string compiled with
`System.Linq.Dynamic.Core`. Node has no equivalent that does not involve `eval`
or a new parser dependency, so the option became a function:

```ts
@LogMethod({ resolveRequestId: (args) => `order-${args[0]}` })
```

It is type safe, has no dependencies and never evaluates arbitrary strings.

### D3 — Sync, async and Observable

The .NET library is entirely synchronous. Every hook here runs correctly over a
plain value, a `Promise` and an `Observable`, and the shape of the return value
is preserved: a synchronous method stays synchronous. `ResultHelper` in
`@nestjslatam/aop` implements this.

Consequence for `@Retry`: `delayMs` needs an async or Observable method. On a
synchronous method the retry is immediate, because pausing it would block the
event loop.

## Other divergences

- **Stateless aspects.** NestJS providers are singletons; keeping per invocation
  state in fields, as `RetryAspect.Count` does in .NET, leaks between calls.
  State lives in `IAspectContext`.
- **`onExit` always runs.** The .NET `OnRetryAspect` skips `OnExit` when the
  retries are exhausted; here it runs once on every path.
- **`LogArguments`.** .NET filters by parameter name; TypeScript does not keep
  names at runtime, so `logArguments` takes `true` or a list of indexes.
- **`Advice.OnException`.** The .NET default assigns `default(T)` to value type
  returns; TypeScript has no such notion, so the return value is untouched.
- **`AbstractAspect` is named `BaseAspect`.** NestJS uses the `Base*` prefix in
  its own API (`BaseExceptionFilter`, `BaseRpcExceptionFilter`); `Abstract*` is a
  .NET and Java convention. `OnMethodBoundaryAspect` and `OnRetryAspect` keep
  their names: those are AOP domain terms, not language conventions.
- **`@nestjslatam/core-lib`.** The dependency was inlined as
  `getUtcDateTimeFormatted` in `@nestjslatam/aop.aspects.logger` because the
  package is no longer resolvable from the public npm registry. The timestamp
  format is unchanged.

## Beyond the .NET library

`@nestjslatam/aop.aspects.telemetry` has no counterpart in `BeyondNet.Aop`. It
adds `TraceAspect` and the `@Trace()` decorator: one OpenTelemetry span per
intercepted call, active while the method runs, with the `traceId` / `spanId`
handed to the logging aspect so every log line carries them. That is what
correlates Loki logs with Tempo traces in Grafana.

## Compatibility with v1

`@nestjslatam/logreflector-lib` keeps every public export of v1.0.13:
`LogReflectorModule`, `LogMethod`, `LogSensitiveParam`, `MetadataHelper`,
`TemplateHelper`, `JsonSerializer`, `ISerializer`, `eLogType`, `ILogReflector`,
`IMetadata`, `IOptions`, `IOptionsAsync`, `IOptionsFactory`, `ReflectorFactory`,
`ReflectorBuilder`, `LogReflectorDefault` and the `LOG_REFLECTOR_*` tokens, plus
the message templates. It also re-exports the whole `aop.*` family, so
`@Retry` and `@UseAdvice` are available without touching the imports.

`LogReflectorModule.forRoot` and `forRootAsync` now register `AopModule`
underneath. Changes are additive; the version moves to 1.1.0.

Behaviour fixed on the way, all of it observable from v1 code:

1. `@LogMethod()` without arguments used to throw; the options are optional now.
2. The `catch` branch re-invoked the failed method losing `this`; the error is
   logged and rethrown once.
3. The duration was always `0`; it is measured from the start of the call.
4. `forRootAsync` failed when `imports` was missing.
5. `ReflectorFactory.getLogger()` returned `undefined` for any configuration
   other than `extension: 'default'` with `serializer: 'json'`.
6. `JsonSerializer` threw on circular structures, breaking the intercepted
   method.