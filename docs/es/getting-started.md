# Primeros pasos

## Instalación

```bash
npm install @nestjslatam/aop.nestjs
```

Arrastra `@nestjslatam/aop`, `@nestjslatam/aop.aspects` y
`@nestjslatam/aop.aspects.logger`. Los proyectos que ya usan
`@nestjslatam/logreflector-lib` no necesitan instalar nada: lo reexporta todo.

## Registrar el módulo

```ts
import { Module } from '@nestjs/common';
import { AopModule } from '@nestjslatam/aop.nestjs';

@Module({
  imports: [AopModule.forRoot({ configuration: { serializer: 'json' } })],
})
export class AppModule {}
```

De forma asíncrona:

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

El módulo es global, así que los decoradores funcionan en cualquier módulo sin
volver a importarlo.

## Loguear un método

```ts
@Injectable()
export class OrdersService {
  @LogMethod()
  find(id: string) {
    return this.repository.findOne(id);
  }
}
```

Opciones disponibles: `logArguments`, `logReturn`, `logDuration`,
`logException`, `trackingId`, `requestId`, `resolveRequestId`, `logger` y
`order`.

```ts
@LogMethod({
  logArguments: [0],
  logReturn: false,
  resolveRequestId: (args) => `order-${args[0]}`,
})
```

## Reintentar un método

```ts
@Retry({ maxAttempts: 3, delayMs: 200, backoff: 'exponential' })
async call(): Promise<Payload> {
  return this.http.get('/payload');
}
```

`errorTypes` limita el reintento a ciertos errores y `handleException: true`
traga el error al agotar los intentos. El retardo requiere un método asíncrono u
Observable.

## Combinar aspectos

```ts
@LogMethod({ order: 1 })
@Retry({ order: 2, maxAttempts: 2 })
async pay(orderId: string): Promise<Receipt> { ... }
```

El `order` menor se ejecuta primero, así la llamada se loguea una sola vez
alrededor de todos los intentos.

## Advice propio

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

## Datos sensibles

```ts
@LogMethod()
login(user: string, @LogSensitiveParam() password: string) { ... }

export class Customer {
  @LogSensitive()
  taxId: string;
}
```

El enmascarado de propiedades requiere `configuration.serializer: 'sensitive'`.

## Sink propio

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

## Sink de pino

```bash
npm install @nestjslatam/aop.aspects.logger.pino pino
```

```ts
import { PinoSink } from '@nestjslatam/aop.aspects.logger.pino';

AopModule.forRoot({ configure: (builder) => builder.addLogger(PinoSink) });

@LogMethod({ logger: PinoSink })
find(id: string) { ... }
```

Escribe una línea JSON por fase (`debug` para entrada, resultado y salida,
`error` para excepciones), lista para Loki, Elastic o cualquier colector que lea
stdout.

## Trazas

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

Un solo span cubre el logging y todos los reintentos, y el `traceId` / `spanId`
llegan al sink de logs, que es lo que enlaza Loki y Tempo en Grafana.
