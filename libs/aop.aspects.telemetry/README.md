# @nestjslatam/aop.aspects.telemetry

Aspecto de trazas con OpenTelemetry para
[`@nestjslatam/aop`](https://www.npmjs.com/package/@nestjslatam/aop).

No tiene equivalente en la librería .NET `BeyondNet.Aop`: es la cara de trazas
del mismo `OnMethodBoundaryAspect` que impulsa a `LoggerAspect`.

`@opentelemetry/api` es una peer dependency.

```bash
npm install @nestjslatam/aop.aspects.telemetry @opentelemetry/api
```

## Registro

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

El aspecto usa el tracer provider registrado globalmente, así que el SDK se
configura como siempre (`NodeSDK`,
`@opentelemetry/auto-instrumentations-node`, o un `instrumentation.ts` cargado
antes que la aplicación).

## Uso

```ts
@Trace()
@LogMethod()
@Retry({ maxAttempts: 3 })
async pay(orderId: string): Promise<Receipt> { ... }
```

`@Trace()` se ejecuta como el más externo por defecto (`order: 0`), de modo que
un único span cubre el logging y todos los reintentos. Opciones: `name`, `kind`,
`tracer`, `attributes`, `resolveAttributes(args, joinPoint)`, `recordException`
y `order`.

```ts
@Trace({
  name: 'orders.pay',
  kind: SpanKind.SERVER,
  resolveAttributes: (args) => ({ 'order.id': args[0] }),
})
```

Cada span lleva los atributos de convención semántica `code.function` y
`code.namespace`, se cierra tanto en éxito como en fallo, y recibe
`SpanStatusCode.ERROR` más la excepción registrada cuando el método lanza. El
error siempre se relanza: el aspecto observa, no traga.

## Correlación con los logs

Mientras el método corre, el span es el span **activo**, así que todo lo que se
llame dentro cuelga de la misma traza, y el aspecto escribe `traceId` / `spanId`
en el join point. `LoggerAspect` los recoge, lo que significa:

- `PinoSink` los emite como campos estructurados.
- `NestLoggerSink` añade `[TraceId: ..., SpanId: ...]` al mensaje.

Eso es lo que permite saltar en Grafana de una línea de Loki a la traza en
Tempo.

```json
{"level":20,"msg":"Start Call.","className":"OrdersService","methodName":"pay","traceId":"4bf92f…","spanId":"00f067…"}
```

## Documentación

[Guía How-To: trazas](https://github.com/nestjslatam/aop/blob/main/docs/es/how-to.md#trazar-una-llamada-y-saltar-del-log-a-la-traza) ·
[Manual de uso](https://github.com/nestjslatam/aop/blob/main/docs/es/usage.md)

## Licencia

MIT
