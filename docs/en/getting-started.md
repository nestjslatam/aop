# Getting started

## Install

```bash
npm install @nestjslatam/aop.nestjs
```

`@nestjslatam/aop`, `@nestjslatam/aop.aspects` and
`@nestjslatam/aop.aspects.logger` come with it. Projects already using
`@nestjslatam/logreflector-lib` need no new install: it re-exports everything.

## Register the module

```ts
import { Module } from '@nestjs/common';
import { AopModule } from '@nestjslatam/aop.nestjs';

@Module({
  imports: [AopModule.forRoot({ configuration: { serializer: 'json' } })],
})
export class AppModule {}
```

Asynchronously:

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

The module is global, so the decorators work in any module without importing it
again.

## Log a method

```ts
@Injectable()
export class OrdersService {
  @LogMethod()
  find(id: string) {
    return this.repository.findOne(id);
  }
}
```

Available options: `logArguments`, `logReturn`, `logDuration`, `logException`,
`trackingId`, `requestId`, `resolveRequestId`, `logger` and `order`.

```ts
@LogMethod({
  logArguments: [0],
  logReturn: false,
  resolveRequestId: (args) => `order-${args[0]}`,
})
```

## Retry a method

```ts
@Retry({ maxAttempts: 3, delayMs: 200, backoff: 'exponential' })
async call(): Promise<Payload> {
  return this.http.get('/payload');
}
```

`errorTypes` limits the retry to certain errors and `handleException: true`
swallows the error once the attempts are exhausted. The delay needs an async or
Observable method.

## Combine aspects

```ts
@LogMethod({ order: 1 })
@Retry({ order: 2, maxAttempts: 2 })
async pay(orderId: string): Promise<Receipt> { ... }
```

Lower `order` runs first, so the call is logged once around every attempt.

## Custom advice

```ts
@Injectable()
export class AuditAdvice implements IAdvice {
  onEntry(joinPoint: IJoinPoint, context?: any[]) { ... }
  onSuccess(joinPoint: IJoinPoint) { ... }
  onExit(joinPoint: IJoinPoint) { ... }
  onException(joinPoint: IJoinPoint, context: any[] | undefined, error: any) { ... }
}

AopModule.forRoot({ configure: (builder) => builder.addAdvice(AuditAdvice) });

@UseAdvice({ advice: AuditAdvice, context: ['orders'] })
save(order: Order) { ... }
```

## Sensitive data

```ts
@LogMethod()
login(user: string, @LogSensitiveParam() password: string) { ... }

export class Customer {
  @LogSensitive()
  taxId: string;
}
```

Property masking requires `configuration.serializer: 'sensitive'`.

## Custom sink

```ts
@Injectable()
export class FileSink implements IAopLogger {
  onEntry(context: ILogContext, parameters?: Parameter[]) { ... }
  onCall(context: ILogContext, result: Result) { ... }
  onExit(context: ILogContext) { ... }
  onException(context: ILogContext, error: Error) { ... }
}

AopModule.forRoot({ configure: (builder) => builder.addLogger(FileSink) });

@LogMethod({ logger: FileSink })
export class Report { ... }
```

## pino sink

```bash
npm install @nestjslatam/aop.aspects.logger.pino pino
```

```ts
import { PinoSink } from '@nestjslatam/aop.aspects.logger.pino';

AopModule.forRoot({ configure: (builder) => builder.addLogger(PinoSink) });

@LogMethod({ logger: PinoSink })
find(id: string) { ... }
```

Writes one JSON line per phase (`debug` for entry, result and exit, `error` for
exceptions), ready for Loki, Elastic or any collector that reads stdout.

## Tracing

```bash
npm install @nestjslatam/aop.aspects.telemetry @opentelemetry/api
```

```ts
AopModule.forRoot({ configure: (builder) => builder.addAspect(TraceAspect) });

@Trace()
@LogMethod()
@Retry({ maxAttempts: 3 })
async pay(orderId: string) { ... }
```

One span covers the logging and every retry, and the `traceId` / `spanId` reach
the log sink, which is what links Loki and Tempo in Grafana.
