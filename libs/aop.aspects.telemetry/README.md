# @nestjslatam/aop.aspects.telemetry

OpenTelemetry tracing aspect for
[`@nestjslatam/aop`](https://www.npmjs.com/package/@nestjslatam/aop).

It has no counterpart in the `BeyondNet.Aop` .NET library: it is the tracing
side of the same `OnMethodBoundaryAspect` that powers `LoggerAspect`.

`@opentelemetry/api` is a peer dependency.

```bash
npm install @nestjslatam/aop.aspects.telemetry @opentelemetry/api
```

## Registration

```ts
import { AopModule } from '@nestjslatam/aop.nestjs';
import { TraceAspect } from '@nestjslatam/aop.aspects.telemetry';

@Module({
  imports: [
    AopModule.forRoot({ configure: (builder) => builder.addAspect(TraceAspect) }),
  ],
})
export class AppModule {}
```

The aspect uses the globally registered tracer provider, so the SDK is set up
the usual way (`NodeSDK`, `@opentelemetry/auto-instrumentations-node`, or an
`instrumentation.ts` loaded before the app).

## Usage

```ts
@Trace()
@LogMethod()
@Retry({ maxAttempts: 3 })
async pay(orderId: string): Promise<Receipt> { ... }
```

`@Trace()` runs outermost by default (`order: 0`), so a single span covers the
logging and every retry attempt. Options: `name`, `kind`, `tracer`,
`attributes`, `resolveAttributes(args, joinPoint)`, `recordException` and
`order`.

```ts
@Trace({
  name: 'orders.pay',
  kind: SpanKind.SERVER,
  resolveAttributes: (args) => ({ 'order.id': args[0] }),
})
```

Every span carries the semantic convention attributes `code.function` and
`code.namespace`, ends on success and on failure, and gets
`SpanStatusCode.ERROR` plus the recorded exception when the method throws. The
error is always rethrown: the aspect observes, it does not swallow.

## Correlation with the logs

While the method runs the span is the **active** span, so anything called
inside it hangs from the same trace, and the aspect writes `traceId` / `spanId`
on the join point. `LoggerAspect` picks them up, which means:

- `PinoSink` emits them as structured fields.
- `NestLoggerSink` appends `[TraceId: ..., SpanId: ...]` to the message.

That is what lets Grafana jump from a Loki line to the trace in Tempo.

```json
{"level":20,"msg":"Start Call.","className":"OrdersService","methodName":"pay","traceId":"4bf92f...","spanId":"00f067..."}
```
