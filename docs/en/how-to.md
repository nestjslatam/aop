# How-To guide

Task-oriented recipes. Each one states the problem, the steps and what you get.
For the full reference of options, read the [usage manual](usage.md).

- [Log everything a service does](#log-everything-a-service-does)
- [Correlate the logs of one request](#correlate-the-logs-of-one-request)
- [Keep passwords out of the logs](#keep-passwords-out-of-the-logs)
- [Retry a call that fails intermittently](#retry-a-call-that-fails-intermittently)
- [Send the logs to Loki and see them in Grafana](#send-the-logs-to-loki-and-see-them-in-grafana)
- [Trace a call and jump from the log to the trace](#trace-a-call-and-jump-from-the-log-to-the-trace)
- [Audit who changes what, with your own advice](#audit-who-changes-what-with-your-own-advice)
- [Write logs somewhere else](#write-logs-somewhere-else)
- [Build an aspect of your own](#build-an-aspect-of-your-own)
- [Test a decorated class](#test-a-decorated-class)
- [Upgrade from logreflector-lib v1](#upgrade-from-logreflector-lib-v1)
- [Troubleshooting](#troubleshooting)

---

## Log everything a service does

**Problem.** You want to know what a service receives, what it returns and how
long it takes, without filling it with `console.log`.

**1. Register the module once.**

```ts
@Module({ imports: [AopModule.forRoot()] })
export class AppModule {}
```

**2. Decorate the methods.**

```ts
@Injectable()
export class OrdersService {
  @LogMethod()
  find(id: string) {
    return this.repository.findOne(id);
  }
}
```

**What you get.** Three lines per call: arguments on entry, value and duration
on the result, and the exit.

```
… [OrdersService.cs, find] Start Call. Took 0 ms. Args: [{"index":0,"name":"String","value":"7"}].
… [OrdersService.cs, find]. Took 12 ms. Result: Promise, {"id":"7","total":90}.
… [OrdersService.cs, find] End Call. Took 12 ms.
```

Errors are logged and **rethrown**: the aspect observes, it never changes the
behaviour of your method.

---

## Correlate the logs of one request

**Problem.** Several services take part in one request and you cannot tell
which lines belong together.

**Option A — the identifier is in the arguments.**

```ts
@LogMethod({ resolveRequestId: (args) => `order-${args[0]}` })
pay(orderId: string) { ... }
```

**Option B — the identifier comes with the HTTP request.** Let the interceptor
read the `x-request-id` header:

```ts
{ provide: APP_INTERCEPTOR, useClass: AopInterceptor }

@Get(':id')
@LogMethod({ useInterceptor: true })
find(@Param('id') id: string) { ... }
```

**Option C — a business mark.** `trackingId` groups calls that belong to the
same process, whatever the request:

```ts
@LogMethod({ trackingId: 'monthly-billing' })
```

**What you get.** `[RequestId: order-7]` and `[Tracking ID: monthly-billing]`
on every line, ready to filter by.

---

## Keep passwords out of the logs

**Problem.** A method receives a password, a card or a tax id and you do not
want them written anywhere.

**For an argument**, mark it:

```ts
@LogMethod()
login(user: string, @LogSensitiveParam() password: string) { ... }
```

```
Args: [{"index":0,"name":"String","value":"ada"},{"index":1,"name":"String","value":"**********"}]
```

**For a property inside an object**, mark the property and switch the
serializer on:

```ts
AopModule.forRoot({ configuration: { serializer: 'sensitive' } });

export class Customer {
  name: string;

  @LogSensitive()
  taxId: string;
}
```

Any `Customer` reaching a log — as an argument or as a returned value — comes
out with `taxId` masked, however deep in the payload it is.

> The two mechanisms are independent: the parameter one works with any
> serializer, the property one needs `serializer: 'sensitive'`.

---

## Retry a call that fails intermittently

**Problem.** An external API fails once in a while and you do not want to write
the retry loop by hand.

```ts
@Retry({ maxAttempts: 3, delayMs: 200, backoff: 'exponential' })
async fetchRate(): Promise<Rate> {
  return this.http.get('/rates');
}
```

Four calls at most, waiting 200 ms, 400 ms and 800 ms.

**Retry only what is worth retrying:**

```ts
@Retry({ maxAttempts: 3, errorTypes: [TimeoutError, ServiceUnavailableError] })
```

A `ValidationError` propagates on the first attempt: retrying it would be
pointless.

**Log the whole thing once, not once per attempt:**

```ts
@LogMethod({ order: 1 })
@Retry({ order: 2, maxAttempts: 3 })
async fetchRate(): Promise<Rate> { ... }
```

The lower `order` runs further out, so you get one `Start Call` and one
`End Call` with the total duration of every attempt.

> **Careful with synchronous methods.** `delayMs` needs an `async` method or an
> `Observable`; on a synchronous one the retries happen immediately, because
> pausing would block the event loop.

---

## Send the logs to Loki and see them in Grafana

**Problem.** You want to query your logs in Grafana instead of reading a
terminal.

Loki does not read your application: it ingests what an agent picks up from
stdout. So all you need is structured JSON.

**1. Install the pino sink.**

```bash
npm install @nestjslatam/aop.aspects.logger.pino pino
```

**2. Register it and point the decorator at it.**

```ts
AopModule.forRoot({ configure: (builder) => builder.addLogger(PinoSink) });

@LogMethod({ logger: PinoSink })
pay(orderId: string) { ... }
```

**What you get.** One JSON line per phase:

```json
{"level":20,"msg":"Start Call.","className":"OrdersService","methodName":"pay","requestId":"order-7"}
{"level":20,"msg":"End Call.","className":"OrdersService","methodName":"pay","duration":17,"return":"\"receipt-7\""}
```

**3. Query in Grafana.** Every field is a filter:

```logql
{app="orders"} | json | className="OrdersService" | duration > 1000
```

To push straight to Loki without an agent, pass a pino instance with the
`pino-loki` transport to the sink; the library does not need to know.

---

## Trace a call and jump from the log to the trace

**Problem.** You see a slow line in Loki and you want the trace behind it.

**1. Install the telemetry package.**

```bash
npm install @nestjslatam/aop.aspects.telemetry @opentelemetry/api
```

**2. Register the aspect** (your OpenTelemetry SDK is set up as usual, in an
`instrumentation.ts` loaded before the app).

```ts
AopModule.forRoot({ configure: (builder) => builder.addAspect(TraceAspect) });
```

**3. Decorate.**

```ts
@Trace()
@LogMethod({ logger: PinoSink })
@Retry({ maxAttempts: 3 })
async pay(orderId: string) { ... }
```

**What you get.**

- One span per call, named `OrdersService.pay`, covering the logging and every
  retry attempt.
- The span is **active** while the method runs, so every HTTP or database call
  inside hangs from it automatically.
- `traceId` and `spanId` on every log line.

```json
{"level":20,"msg":"Start Call.","className":"OrdersService","methodName":"pay","traceId":"4bf92f…","spanId":"00f067…"}
```

**4. In Grafana**, configure the Loki data source with a derived field over
`traceId` pointing at Tempo. From then on every log line has a button that
opens its trace.

Add business context to the span:

```ts
@Trace({
  kind: SpanKind.SERVER,
  resolveAttributes: (args) => ({ 'order.id': args[0] }),
})
```

---

## Audit who changes what, with your own advice

**Problem.** You need to record every write to a table, and logging is not
enough: it has to go to your audit trail.

**1. Write the advice.**

```ts
@Injectable()
export class AuditAdvice implements IAdvice {
  constructor(private readonly audit: AuditService) {}

  onSuccess(joinPoint: IJoinPoint, context?: any[]): void {
    this.audit.record({
      entity: context?.[0],
      action: joinPoint.methodInfo.name,
      payload: joinPoint.args[0],
      durationMs: joinPoint.elapsedMs,
    });
  }

  onEntry(): void {}
  onExit(): void {}
  onException(joinPoint: IJoinPoint, context: any[] | undefined, error: any): void {
    this.audit.recordFailure(joinPoint.methodInfo.name, error);
  }
}
```

**2. Register it.**

```ts
AopModule.forRoot({ configure: (builder) => builder.addAdvice(AuditAdvice) });
```

**3. Use it.**

```ts
@UseAdvice({ advice: AuditAdvice, context: ['orders'] })
save(order: Order) { ... }
```

The advice is a normal provider: inject whatever you need into it.

---

## Write logs somewhere else

**Problem.** Your logs must go to a file, a queue or an internal collector.

Implement `IAopLogger`:

```ts
@Injectable()
export class QueueSink implements IAopLogger {
  constructor(private readonly queue: QueueService) {}

  onEntry(context: ILogContext, parameters?: Parameter[]): void {
    this.queue.publish('logs', { phase: 'entry', ...context, parameters });
  }

  onCall(context: ILogContext, result: Result): void {
    this.queue.publish('logs', { phase: 'call', ...context, result });
  }

  onExit(context: ILogContext): void {
    this.queue.publish('logs', { phase: 'exit', ...context });
  }

  onException(context: ILogContext, error: Error): void {
    this.queue.publish('logs', { phase: 'exception', ...context, error: error.message });
  }
}
```

```ts
AopModule.forRoot({ configure: (builder) => builder.addLogger(QueueSink) });

@LogMethod({ logger: QueueSink })
```

Without `logger`, the default sink is used, so you can mix sinks per method.

---

## Build an aspect of your own

**Problem.** You need cross-cutting behaviour that is neither logging, nor
retrying, nor auditing: a cache, a circuit breaker, a permission check.

```ts
const CACHE_TOKEN = 'aop:aspect:cache';

@Injectable()
export class CacheAspect extends OnMethodBoundaryAspect<ICacheOptions> {
  readonly token = CACHE_TOKEN;

  constructor(private readonly cache: CacheService) {
    super();
  }

  protected shouldContinue(joinPoint: IJoinPoint, context): boolean {
    const hit = this.cache.get(this.keyOf(joinPoint));

    if (hit === undefined) return true;

    joinPoint.returnValue = hit;   // short circuit: the method is not called
    return false;
  }

  protected onSuccess(joinPoint: IJoinPoint, context): void {
    this.cache.set(this.keyOf(joinPoint), joinPoint.returnValue, context.options.ttl);
  }

  private keyOf(joinPoint: IJoinPoint): string {
    return `${joinPoint.targetType}.${joinPoint.methodInfo.name}:${JSON.stringify(joinPoint.args)}`;
  }
}

export const Cached = (options: ICacheOptions = {}) => applyAspect(CACHE_TOKEN, options);
```

```ts
AopModule.forRoot({ configure: (builder) => builder.addAspect(CacheAspect) });

@Cached({ ttl: 60 })
findRate(currency: string) { ... }
```

Two rules to respect:

1. **No mutable state in fields.** Aspects are singletons; per invocation state
   goes in `context.state`.
2. **Do not swallow errors** unless that is the point of the aspect. Set
   `context.handleException = true` only if you rethrow from `onException`.

---

## Test a decorated class

**Problem.** In a unit test there is no NestJS container, so there is no
executor either.

Without one, the decorators are transparent: the original method runs and
nothing is logged. That is often what you want. To assert the aspects, wire
them by hand:

```ts
import { AspectExecutor, AspectPointCut } from '@nestjslatam/aop';
import { LoggerAspect, RetryAspect } from '@nestjslatam/aop.aspects';
import { AopRegistry } from '@nestjslatam/aop.nestjs';

beforeEach(() => {
  const sink = new FakeSink();

  AopRegistry.set(
    new AspectExecutor(
      [new LoggerAspect(() => sink), new RetryAspect()],
      new AspectPointCut(),
    ),
  );
});

afterEach(() => AopRegistry.reset());
```

In integration tests use the real container and swap the sink:

```ts
await Test.createTestingModule({ imports: [AopModule.forRoot()], providers: [OrdersService] })
  .overrideProvider(AOP_LOGGER)
  .useValue(new FakeSink())
  .compile();
```

---

## Upgrade from logreflector-lib v1

**Problem.** You are on `@nestjslatam/logreflector-lib@1.0.13` and want the new
aspects.

**1. Bump the version.** Nothing else changes: every v1 export keeps its name
and its types.

```bash
npm install @nestjslatam/logreflector-lib@^1.1.0
```

**2. You already have the new decorators**, because the package re-exports the
whole family:

```ts
import { LogMethod, Retry, UseAdvice } from '@nestjslatam/logreflector-lib';
```

**3. Three things behave differently, because they were broken:**

| Before | Now |
| --- | --- |
| `@LogMethod()` without arguments threw | It works; the options are optional |
| A failing method was invoked a second time | The error is logged once and rethrown |
| `Took 0 ms` on every line | The real duration |

**4. When you want to move over**, replace `LogReflectorModule` with
`AopModule`, which has the same shape and a clearer options object.

---

## Troubleshooting

**Nothing is logged.**
The class is not managed by NestJS, or `AopModule` was never registered. The
decorators resolve the executor from the container first and from `AopRegistry`
second; without either they run the original method untouched.

**Parameter types show as `Unknown`.**
`emitDecoratorMetadata` is off in `tsconfig.json`.

**Everything is logged twice.**
You have `AopInterceptor` registered globally **and** a method with
`useInterceptor: true` that also wraps. The interceptor already skips wrapped
handlers; check you did not build a second wrapper by hand.

**The retry does not wait.**
The method is synchronous. `delayMs` needs an `async` method or an
`Observable`.

**The sensitive property is not masked.**
`configuration.serializer` is `'json'`. Property masking needs `'sensitive'`;
`@LogSensitiveParam()` works with both.

**`@Trace()` produces no spans.**
The OpenTelemetry SDK is not registered, or it is registered after the
application starts. It must load before, usually with `--require ./instrumentation.js`.
