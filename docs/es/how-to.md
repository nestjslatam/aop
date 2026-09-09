# Guía How-To

Recetas orientadas a tareas. Cada una plantea el problema, los pasos y lo que
obtienes. Para la referencia completa de opciones, ve al
[manual de uso](usage.md).

- [Loguear todo lo que hace un servicio](#loguear-todo-lo-que-hace-un-servicio)
- [Correlacionar los logs de una petición](#correlacionar-los-logs-de-una-petición)
- [Mantener las contraseñas fuera de los logs](#mantener-las-contraseñas-fuera-de-los-logs)
- [Reintentar una llamada que falla de forma intermitente](#reintentar-una-llamada-que-falla-de-forma-intermitente)
- [Mandar los logs a Loki y verlos en Grafana](#mandar-los-logs-a-loki-y-verlos-en-grafana)
- [Trazar una llamada y saltar del log a la traza](#trazar-una-llamada-y-saltar-del-log-a-la-traza)
- [Auditar quién cambia qué, con tu propio advice](#auditar-quién-cambia-qué-con-tu-propio-advice)
- [Escribir los logs en otro sitio](#escribir-los-logs-en-otro-sitio)
- [Construir un aspecto propio](#construir-un-aspecto-propio)
- [Testear una clase decorada](#testear-una-clase-decorada)
- [Actualizar desde logreflector-lib v1](#actualizar-desde-logreflector-lib-v1)
- [Resolución de problemas](#resolución-de-problemas)

---

## Loguear todo lo que hace un servicio

**Problema.** Quieres saber qué recibe un servicio, qué devuelve y cuánto
tarda, sin llenarlo de `console.log`.

**1. Registra el módulo una vez.**

```ts
@Module({ imports: [AopModule.forRoot()] })
export class AppModule {}
```

**2. Decora los métodos.**

```ts
@Injectable()
export class OrdersService {
  @LogMethod()
  find(id: string) {
    return this.repository.findOne(id);
  }
}
```

**Qué obtienes.** Tres líneas por llamada: argumentos en la entrada, valor y
duración en el resultado, y la salida.

```
… [OrdersService.cs, find] Start Call. Took 0 ms. Args: [{"index":0,"name":"String","value":"7"}].
… [OrdersService.cs, find]. Took 12 ms. Result: Promise, {"id":"7","total":90}.
… [OrdersService.cs, find] End Call. Took 12 ms.
```

Los errores se registran y se **relanzan**: el aspecto observa, nunca cambia el
comportamiento de tu método.

---

## Correlacionar los logs de una petición

**Problema.** Varios servicios participan en una petición y no distingues qué
líneas van juntas.

**Opción A — el identificador está en los argumentos.**

```ts
@LogMethod({ resolveRequestId: (args) => `order-${args[0]}` })
pay(orderId: string) { ... }
```

**Opción B — el identificador viene con la petición HTTP.** Deja que el
interceptor lea la cabecera `x-request-id`:

```ts
{ provide: APP_INTERCEPTOR, useClass: AopInterceptor }

@Get(':id')
@LogMethod({ useInterceptor: true })
find(@Param('id') id: string) { ... }
```

**Opción C — una marca de negocio.** `trackingId` agrupa llamadas del mismo
proceso, venga de donde venga la petición:

```ts
@LogMethod({ trackingId: 'facturacion-mensual' })
```

**Qué obtienes.** `[RequestId: order-7]` y `[Tracking ID: facturacion-mensual]`
en cada línea, listos para filtrar.

---

## Mantener las contraseñas fuera de los logs

**Problema.** Un método recibe una contraseña, una tarjeta o un RUC y no
quieres que se escriban en ningún sitio.

**Para un argumento**, márcalo:

```ts
@LogMethod()
login(user: string, @LogSensitiveParam() password: string) { ... }
```

```
Args: [{"index":0,"name":"String","value":"ada"},{"index":1,"name":"String","value":"**********"}]
```

**Para una propiedad dentro de un objeto**, marca la propiedad y activa el
serializador:

```ts
AopModule.forRoot({ configuration: { serializer: 'sensitive' } });

export class Customer {
  name: string;

  @LogSensitive()
  taxId: string;
}
```

Cualquier `Customer` que llegue a un log — como argumento o como valor devuelto
— sale con el `taxId` enmascarado, esté a la profundidad que esté del payload.

> Los dos mecanismos son independientes: el de parámetro funciona con cualquier
> serializador, el de propiedad necesita `serializer: 'sensitive'`.

---

## Reintentar una llamada que falla de forma intermitente

**Problema.** Una API externa falla de vez en cuando y no quieres escribir el
bucle de reintentos a mano.

```ts
@Retry({ maxAttempts: 3, delayMs: 200, backoff: 'exponential' })
async fetchRate(): Promise<Rate> {
  return this.http.get('/rates');
}
```

Como mucho cuatro llamadas, esperando 200 ms, 400 ms y 800 ms.

**Reintenta solo lo que vale la pena reintentar:**

```ts
@Retry({ maxAttempts: 3, errorTypes: [TimeoutError, ServiceUnavailableError] })
```

Un `ValidationError` se propaga al primer intento: reintentarlo no tendría
sentido.

**Loguea el conjunto una vez, no una por intento:**

```ts
@LogMethod({ order: 1 })
@Retry({ order: 2, maxAttempts: 3 })
async fetchRate(): Promise<Rate> { ... }
```

El `order` menor se ejecuta más hacia afuera, así que obtienes un solo
`Start Call` y un solo `End Call` con la duración total de todos los intentos.

> **Ojo con los métodos síncronos.** `delayMs` necesita un método `async` o un
> `Observable`; en uno síncrono los reintentos son inmediatos, porque pausar
> bloquearía el event loop.

---

## Mandar los logs a Loki y verlos en Grafana

**Problema.** Quieres consultar tus logs en Grafana en vez de leer una terminal.

Loki no lee tu aplicación: ingiere lo que un agente recoge de stdout. Así que
lo único que necesitas es JSON estructurado.

**1. Instala el sink de pino.**

```bash
npm install @nestjslatam/aop.aspects.logger.pino pino
```

**2. Regístralo y apunta el decorador.**

```ts
AopModule.forRoot({ configure: (builder) => builder.addLogger(PinoSink) });

@LogMethod({ logger: PinoSink })
pay(orderId: string) { ... }
```

**Qué obtienes.** Una línea JSON por fase:

```json
{"level":20,"msg":"Start Call.","className":"OrdersService","methodName":"pay","requestId":"order-7"}
{"level":20,"msg":"End Call.","className":"OrdersService","methodName":"pay","duration":17,"return":"\"receipt-7\""}
```

**3. Consulta en Grafana.** Cada campo es un filtro:

```logql
{app="orders"} | json | className="OrdersService" | duration > 1000
```

Para empujar directo a Loki sin agente, pásale al sink una instancia de pino
con el transport `pino-loki`; la librería no necesita enterarse.

---

## Trazar una llamada y saltar del log a la traza

**Problema.** Ves una línea lenta en Loki y quieres la traza que hay detrás.

**1. Instala el paquete de telemetría.**

```bash
npm install @nestjslatam/aop.aspects.telemetry @opentelemetry/api
```

**2. Registra el aspecto** (tu SDK de OpenTelemetry se configura como siempre,
en un `instrumentation.ts` cargado antes que la aplicación).

```ts
AopModule.forRoot({ configure: (builder) => builder.addAspect(TraceAspect) });
```

**3. Decora.**

```ts
@Trace()
@LogMethod({ logger: PinoSink })
@Retry({ maxAttempts: 3 })
async pay(orderId: string) { ... }
```

**Qué obtienes.**

- Un span por llamada, llamado `OrdersService.pay`, que cubre el logging y
  todos los reintentos.
- El span está **activo** mientras el método corre, así que cada llamada HTTP o
  a base de datos que haya dentro cuelga de él automáticamente.
- `traceId` y `spanId` en cada línea de log.

```json
{"level":20,"msg":"Start Call.","className":"OrdersService","methodName":"pay","traceId":"4bf92f…","spanId":"00f067…"}
```

**4. En Grafana**, configura el data source de Loki con un derived field sobre
`traceId` apuntando a Tempo. Desde ese momento cada línea de log tiene un botón
que abre su traza.

Añade contexto de negocio al span:

```ts
@Trace({
  kind: SpanKind.SERVER,
  resolveAttributes: (args) => ({ 'order.id': args[0] }),
})
```

---

## Auditar quién cambia qué, con tu propio advice

**Problema.** Necesitas registrar cada escritura sobre una tabla, y el log no
basta: tiene que ir a tu pista de auditoría.

**1. Escribe el advice.**

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

**2. Regístralo.**

```ts
AopModule.forRoot({ configure: (builder) => builder.addAdvice(AuditAdvice) });
```

**3. Úsalo.**

```ts
@UseAdvice({ advice: AuditAdvice, context: ['orders'] })
save(order: Order) { ... }
```

El advice es un provider normal: inyéctale lo que necesites.

---

## Escribir los logs en otro sitio

**Problema.** Tus logs tienen que ir a un archivo, a una cola o a un colector
interno.

Implementa `IAopLogger`:

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

Sin `logger` se usa el sink por defecto, así que puedes mezclar sinks por
método.

---

## Construir un aspecto propio

**Problema.** Necesitas comportamiento transversal que no es logging, ni
reintento, ni auditoría: una caché, un circuit breaker, una comprobación de
permisos.

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

    joinPoint.returnValue = hit;   // cortocircuito: el método no se llama
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

Dos reglas que respetar:

1. **Nada de estado mutable en campos.** Los aspectos son singletons; el estado
   por invocación va en `context.state`.
2. **No tragues errores** salvo que ese sea el objetivo del aspecto. Pon
   `context.handleException = true` solo si relanzas desde `onException`.

---

## Testear una clase decorada

**Problema.** En un test unitario no hay contenedor de NestJS, así que tampoco
hay executor.

Sin él los decoradores son transparentes: se ejecuta el método original y no se
loguea nada. Muchas veces es justo lo que quieres. Para verificar los aspectos,
cablea la cadena a mano:

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

En tests de integración usa el contenedor real y sustituye el sink:

```ts
await Test.createTestingModule({ imports: [AopModule.forRoot()], providers: [OrdersService] })
  .overrideProvider(AOP_LOGGER)
  .useValue(new FakeSink())
  .compile();
```

---

## Actualizar desde logreflector-lib v1

**Problema.** Estás en `@nestjslatam/logreflector-lib@1.0.13` y quieres los
aspectos nuevos.

**1. Sube la versión.** No cambia nada más: todos los exports de la v1
conservan nombre y tipos.

```bash
npm install @nestjslatam/logreflector-lib@^1.1.0
```

**2. Ya tienes los decoradores nuevos**, porque el paquete reexporta toda la
familia:

```ts
import { LogMethod, Retry, UseAdvice } from '@nestjslatam/logreflector-lib';
```

**3. Tres cosas se comportan distinto, porque estaban rotas:**

| Antes | Ahora |
| --- | --- |
| `@LogMethod()` sin argumentos lanzaba | Funciona; las opciones son opcionales |
| Un método que fallaba se invocaba una segunda vez | El error se loguea una vez y se relanza |
| `Took 0 ms` en todas las líneas | La duración real |

**4. Cuando quieras dar el salto**, sustituye `LogReflectorModule` por
`AopModule`, que tiene la misma forma y un objeto de opciones más claro.

---

## Resolución de problemas

**No se loguea nada.**
La clase no la gestiona NestJS, o nunca se registró `AopModule`. Los
decoradores resuelven el executor primero desde el contenedor y después desde
`AopRegistry`; sin ninguno de los dos ejecutan el método original sin tocarlo.

**Los tipos de los parámetros salen como `Unknown`.**
`emitDecoratorMetadata` está desactivado en `tsconfig.json`.

**Todo se loguea dos veces.**
Tienes `AopInterceptor` registrado global **y** un método con
`useInterceptor: true` que además envuelve. El interceptor ya omite los
handlers envueltos; revisa que no hayas creado un segundo envoltorio a mano.

**El reintento no espera.**
El método es síncrono. `delayMs` necesita un método `async` o un `Observable`.

**La propiedad sensible no se enmascara.**
`configuration.serializer` está en `'json'`. El enmascarado de propiedades
necesita `'sensitive'`; `@LogSensitiveParam()` funciona con ambos.

**`@Trace()` no produce spans.**
El SDK de OpenTelemetry no está registrado, o se registra después de arrancar
la aplicación. Debe cargarse antes, normalmente con
`--require ./instrumentation.js`.
