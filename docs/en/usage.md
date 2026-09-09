# Usage manual

Complete reference of the public API. If you are looking for step-by-step
recipes, read the [How-To guide](how-to.md) instead.

- [1. Installation](#1-installation)
- [2. Registering the module](#2-registering-the-module)
- [3. Decorators](#3-decorators)
- [4. How an intercepted call runs](#4-how-an-intercepted-call-runs)
- [5. Log format](#5-log-format)
- [6. Sinks](#6-sinks)
- [7. Serializers and sensitive data](#7-serializers-and-sensitive-data)
- [8. Injection tokens](#8-injection-tokens)
- [9. Writing your own aspect](#9-writing-your-own-aspect)
- [10. Compatibility with v1](#10-compatibility-with-v1)

---

## 1. Installation

Install the integration package; it brings the core and the aspects with it.

```bash
npm install @nestjslatam/aop.nestjs
```

Optional packages, each with its own peer dependency:

```bash
npm install @nestjslatam/aop.aspects.logger.pino pino            # structured logs
npm install @nestjslatam/aop.aspects.telemetry @opentelemetry/api # tracing
```

Already using `@nestjslatam/logreflector-lib`? Install nothing: it re-exports
the whole family.

Decorators need `reflect-metadata` and these two compiler options, which the
NestJS starter already sets:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

`emitDecoratorMetadata` is what lets the library read the parameter and return
types of your methods. Without it the logs still work, but types show as
`Unknown`.

---

## 2. Registering the module

```ts
import { Module } from '@nestjs/common';
import { AopModule } from '@nestjslatam/aop.nestjs';

@Module({
  imports: [AopModule.forRoot()],
})
export class AppModule {}
```

`AopModule` is **global**: register it once in the root module and the
decorators work anywhere, without importing it again.

### Options

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `behavior.useProduction` | `boolean` | `false` | Reserved for production-specific behaviour |
| `configuration.serializer` | `'json' \| 'sensitive'` | `'json'` | `'sensitive'` masks properties marked with `@LogSensitive()` |
| `configuration.output` | `'console'` | `'console'` | Destination of the default sink |
| `configure` | `(builder) => void` | — | Registers your own aspects, advices and sinks |

### Asynchronous registration

```ts
AopModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    behavior: { useProduction: config.get('NODE_ENV') === 'production' },
    configuration: { serializer: 'sensitive' },
  }),
  inject: [ConfigService],
});
```

`useClass` and `useExisting` are also supported, with a class implementing
`IAopOptionsFactory`:

```ts
export class AopConfig implements IAopOptionsFactory {
  createOptions(): IAopOptions {
    return { configuration: { serializer: 'json' } };
  }
}

AopModule.forRootAsync({ useClass: AopConfig });
```

### Registering your own pieces

```ts
AopModule.forRoot({
  configure: (builder) =>
    builder
      .addAspect(AuditAspect)   // takes part in the chain
      .addAdvice(AuditAdvice)   // available to @UseAdvice({ advice: AuditAdvice })
      .addLogger(PinoSink),     // available to @LogMethod({ logger: PinoSink })
});
```

Each class is registered as a provider under its own token, so it can have its
own dependencies as long as it is `@Injectable()`.

---

## 3. Decorators

### `@LogMethod(options?)`

Logs the entry, the result, the exit and the exception of a method.

```ts
@Injectable()
export class OrdersService {
  @LogMethod()
  find(id: string) {
    return this.repository.findOne(id);
  }
}
```

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `logArguments` | `boolean \| number[]` | `true` | `false` logs no arguments; an array logs only those positions |
| `logReturn` | `boolean` | `true` | Logs the returned value |
| `logDuration` | `boolean` | `true` | Adds the elapsed milliseconds |
| `logException` | `boolean` | `true` | Logs the error. It is always rethrown |
| `trackingId` | `string` | — | Business mark shared by several calls |
| `requestId` | `string` | — | Fixed identifier for the call |
| `resolveRequestId` | `(args, joinPoint) => string` | — | Computes the identifier from the arguments |
| `logger` | token | `AOP_LOGGER` | Sink to write with |
| `order` | `number` | last | Lower runs first, further out in the chain |
| `useInterceptor` | `boolean` | `false` | Delegates to `AopInterceptor` instead of wrapping the method |

```ts
@LogMethod({
  logArguments: [0],
  logReturn: false,
  resolveRequestId: (args) => `order-${args[0]}`,
})
pay(orderId: string, card: Card) { ... }
```

### `@Retry(options?)`

Re-invokes the method while the error is retryable.

```ts
@Retry({ maxAttempts: 3, delayMs: 200, backoff: 'exponential' })
async fetchRate(): Promise<Rate> {
  return this.http.get('/rates');
}
```

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `maxAttempts` | `number` | `3` | Extra attempts after the first failure |
| `delayMs` | `number` | `0` | Wait before each retry |
| `backoff` | `'fixed' \| 'exponential'` | `'fixed'` | `delayMs × 2^attempt` when exponential |
| `errorTypes` | `Array<new () => Error>` | — | Retries only these error classes |
| `handleException` | `boolean` | `false` | `true` swallows the error once the attempts are exhausted |
| `order` | `number` | last | Position in the chain |

> **The delay needs an asynchronous method.** On a synchronous method the retry
> is immediate: pausing it would block the event loop.

### `@UseAdvice(options)`

Runs your own code around the method.

```ts
@UseAdvice({ advice: AuditAdvice, context: ['orders'] })
save(order: Order) { ... }
```

| Option | Type | Required | Meaning |
| --- | --- | --- | --- |
| `advice` | class or token | yes | Advice registered with `builder.addAdvice()` |
| `context` | `any[]` | no | Static data handed to every hook |
| `handleException` | `boolean` | no | `true` swallows the error after `onException` |
| `order` | `number` | no | Position in the chain |

The advice implements `IAdvice`:

```ts
@Injectable()
export class AuditAdvice implements IAdvice {
  onEntry(joinPoint: IJoinPoint, context?: any[]): void {}
  onSuccess(joinPoint: IJoinPoint, context?: any[]): void {}
  onExit(joinPoint: IJoinPoint, context?: any[]): void {}
  onException(joinPoint: IJoinPoint, context: any[] | undefined, error: any): void {}
}
```

### `@Trace(options?)`

Opens an OpenTelemetry span. Requires `@nestjslatam/aop.aspects.telemetry`.

```ts
@Trace({ resolveAttributes: (args) => ({ 'order.id': args[0] }) })
@LogMethod()
@Retry({ maxAttempts: 3 })
async pay(orderId: string) { ... }
```

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `name` | `string` | `Class.method` | Span name |
| `kind` | `SpanKind` | `INTERNAL` | Span kind |
| `tracer` | `string` | `@nestjslatam/aop` | Tracer requested from the global provider |
| `attributes` | `Attributes` | — | Static attributes |
| `resolveAttributes` | `(args, joinPoint) => Attributes` | — | Attributes from the arguments |
| `recordException` | `boolean` | `true` | Records the exception on the span |
| `order` | `number` | `0` | Outermost by default |

### `@LogSensitiveParam()` and `@LogSensitive()`

```ts
@LogMethod()
login(user: string, @LogSensitiveParam() password: string) { ... }

export class Customer {
  @LogSensitive()
  taxId: string;
}
```

The first masks an argument in every log; the second masks a property when the
payload is serialized, and needs `configuration.serializer: 'sensitive'`.

---

## 4. How an intercepted call runs

1. The decorator writes its metadata on the method and, the first time,
   replaces it with a wrapper. Several decorators on the same method share a
   single wrapper.
2. On invocation the wrapper builds a `JoinPoint` and asks the
   `AspectExecutor` which aspects apply.
3. The aspects are sorted by `order` and composed into a chain. Each one runs
   `onEntry`, calls the next link and, when the result settles, runs
   `onSuccess` or `onException` and always `onExit`.

```
@Trace()      order 0   ── span opens ──────────────────────────────┐
@LogMethod()  order 1      ── Start Call logged ──────────────┐     │
@Retry()      order 2         ── attempt 1, 2, 3 ──────┐      │     │
                                   your method         │      │     │
                              ─────────────────────────┘      │     │
                           ── End Call logged ────────────────┘     │
              ── span closes ────────────────────────────────────────┘
```

The result of the method is respected: a synchronous method stays synchronous,
a `Promise` is awaited before logging the result, and an `Observable` is logged
when the stream completes.

### The `IJoinPoint`

Everything an aspect knows about the call:

| Property | Meaning |
| --- | --- |
| `args` | Invocation arguments |
| `returnValue` | Value returned, once resolved |
| `methodInfo` | `name`, `parameterTypes`, `returnType`, `descriptor` |
| `targetObject` / `targetType` | Instance and class name |
| `elapsedMs` | Milliseconds since the call started |
| `requestId` / `trackingId` | Correlation identifiers |
| `traceId` / `spanId` | Filled by `@Trace()` when it is active |
| `proceed()` | Invokes the original method |

### Two interception surfaces

| | Wrapping decorator | `AopInterceptor` |
| --- | --- | --- |
| Applies to | any method | controller and resolver handlers |
| Enabled by | `@LogMethod()` | `@LogMethod({ useInterceptor: true })` |
| Arguments | the real ones | those of the execution context |
| Transport data | not available | `ExecutionContext`, `x-request-id` |

```ts
{ provide: APP_INTERCEPTOR, useClass: AopInterceptor }
```

The interceptor skips handlers already wrapped by a decorator, so a method is
never logged twice.

---

## 5. Log format

The default sink writes one line per phase with these placeholders:

| Field | Meaning |
| --- | --- |
| `{datetime}` | UTC timestamp |
| `{requestid}` | Identifier of the call, `None` when absent |
| `{targettype}` | Class name |
| `{methodinfo}` | Method name |
| `{trackingid}` | Business mark |
| `{took}` | Elapsed milliseconds |
| `{params}` | Serialized arguments |
| `{returnedvalue}` | Serialized returned value |
| `{error}` | Error message |

```
2026-09-09T14:30:18:345 - [RequestId: order-7] - [OrdersService.cs, pay] Start Call. Took 0 ms. Args: [{"index":0,"name":"String","value":"7"}].
2026-09-09T14:30:18:387 - [RequestId: order-7] - [OrdersService.cs, pay]. Took 17 ms. Result: Promise, "receipt-7".
2026-09-09T14:30:18:387 - [OrdersService.cs, pay] End Call. Took 17 ms.
```

When `@Trace()` is active the correlation ids are appended:
`[TraceId: 4bf92f…, SpanId: 00f067…]`.

The templates are exported as constants (`ON_ENTRY_TEMPLATE`,
`ON_CALL_TEMPLATE`, `ON_EXIT_TEMPLATE`, `ON_EXCEPTION_TEMPLATE` and their
`_TRACKING` variants) if you want to reuse them in your own sink.

---

## 6. Sinks

A sink is anything implementing `IAopLogger`:

```ts
export interface IAopLogger {
  onEntry(context: ILogContext, parameters?: Parameter[]): void;
  onCall(context: ILogContext, result: Result): void;
  onExit(context: ILogContext): void;
  onException(context: ILogContext, error: Error): void;
}
```

`ILogContext` carries `targetType`, `methodInfo`, `requestId`, `trackingId`,
`duration` and, when tracing is on, `traceId` and `spanId`.

| Sink | Package | Output |
| --- | --- | --- |
| `NestLoggerSink` | `aop.aspects.logger` | NestJS `Logger`, human readable. Default |
| `PinoSink` | `aop.aspects.logger.pino` | One JSON line per phase, `debug` / `error` |

Register yours with `builder.addLogger(MySink)` and point the decorator at it
with `@LogMethod({ logger: MySink })`.

---

## 7. Serializers and sensitive data

```ts
export interface ISerializer {
  serialize(value: any): string;
}
```

| Serializer | Behaviour |
| --- | --- |
| `JsonSerializer` | `JSON.stringify`, returns `[Unserializable]` instead of throwing |
| `SensitiveDataJsonSerializer` | Same, masking properties marked `@LogSensitive()` |

Masking happens at two levels and they are independent:

- `@LogSensitiveParam()` masks the **argument**, with any serializer.
- `@LogSensitive()` masks the **property**, only with the `sensitive`
  serializer.

Both write `**********`, exported as `SENSITIVE_MASK`.

---

## 8. Injection tokens

| Token | Resolves to |
| --- | --- |
| `AOP_OPTIONS` | The registered `IAopOptions` |
| `AOP_EXECUTOR` | The `IAspectExecutor` |
| `AOP_ASPECTS` | The registered `IAspect[]` |
| `AOP_LOGGER` | The default sink |
| `AOP_SERIALIZER` | The active `ISerializer` |
| `AOP_POINT_CUT` | The `IPointCut` |

```ts
constructor(@Inject(AOP_LOGGER) private readonly sink: IAopLogger) {}
```

---

## 9. Writing your own aspect

An aspect is a class with a `token`, an order and the boundary hooks:

```ts
import { IAspectContext, IJoinPoint, OnMethodBoundaryAspect } from '@nestjslatam/aop';
import { applyAspect } from '@nestjslatam/aop.nestjs';

const AUDIT_TOKEN = 'aop:aspect:audit';

@Injectable()
export class AuditAspect extends OnMethodBoundaryAspect {
  readonly token = AUDIT_TOKEN;

  protected init(joinPoint: IJoinPoint, context: IAspectContext): void {
    context.handleException = true;      // route errors to onException
    context.state.startedAt = Date.now(); // per invocation state
  }

  protected onEntry(joinPoint: IJoinPoint): void { ... }
  protected onSuccess(joinPoint: IJoinPoint): void { ... }
  protected onException(joinPoint: IJoinPoint, context: IAspectContext, error: any): void {
    throw error;                          // observe, do not swallow
  }
  protected onExit(joinPoint: IJoinPoint): void { ... }
}

export const Audit = (options = {}) => applyAspect(AUDIT_TOKEN, options);
```

Register it with `AopModule.forRoot({ configure: (b) => b.addAspect(AuditAspect) })`
and use `@Audit()` on any method.

**Aspects are singletons**, so they must not keep mutable state in fields:
anything belonging to one invocation goes in `context.state`.

To retry inside your aspect, extend `OnRetryAspect` and implement `canRetry()`
and `getDelay()`.

---

## 10. Compatibility with v1

`@nestjslatam/logreflector-lib` 1.1.0 keeps every export of 1.0.13 with the
same types, and now registers `AopModule` underneath, so `@Retry`,
`@UseAdvice` and `@Trace` become available without touching your imports.

```ts
// keeps working exactly as before
LogReflectorModule.forRootAsync({ ... });

@LogMethod({ trackingId: 'x', requestId: 'y' })
print(): string { ... }
```

Behaviour that changed because it was broken: `@LogMethod()` without arguments
no longer throws, a failing method is no longer invoked a second time, and the
logged duration is now real instead of always `0`.

See the [migration guide](migration.md) for the full concept map from the .NET
library.
