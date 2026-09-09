# Manual de uso

Referencia completa de la API pública. Si buscas recetas paso a paso, ve a la
[guía How-To](how-to.md).

- [1. Instalación](#1-instalación)
- [2. Registrar el módulo](#2-registrar-el-módulo)
- [3. Decoradores](#3-decoradores)
- [4. Cómo se ejecuta una llamada interceptada](#4-cómo-se-ejecuta-una-llamada-interceptada)
- [5. Formato de log](#5-formato-de-log)
- [6. Sinks](#6-sinks)
- [7. Serializadores y datos sensibles](#7-serializadores-y-datos-sensibles)
- [8. Tokens de inyección](#8-tokens-de-inyección)
- [9. Crear tu propio aspecto](#9-crear-tu-propio-aspecto)
- [10. Compatibilidad con la v1](#10-compatibilidad-con-la-v1)

---

## 1. Instalación

Instala el paquete de integración; arrastra el núcleo y los aspectos.

```bash
npm install @nestjslatam/aop.nestjs
```

Paquetes opcionales, cada uno con su peer dependency:

```bash
npm install @nestjslatam/aop.aspects.logger.pino pino            # logs estructurados
npm install @nestjslatam/aop.aspects.telemetry @opentelemetry/api # trazas
```

¿Ya usas `@nestjslatam/logreflector-lib`? No instales nada: reexporta toda la
familia.

Los decoradores necesitan `reflect-metadata` y estas dos opciones de compilador,
que el starter de NestJS ya trae:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

`emitDecoratorMetadata` es lo que permite leer los tipos de los parámetros y del
retorno de tus métodos. Sin él los logs siguen funcionando, pero los tipos
aparecen como `Unknown`.

---

## 2. Registrar el módulo

```ts
import { Module } from '@nestjs/common';
import { AopModule } from '@nestjslatam/aop.nestjs';

@Module({
  imports: [AopModule.forRoot()],
})
export class AppModule {}
```

`AopModule` es **global**: se registra una vez en el módulo raíz y los
decoradores funcionan en cualquier parte, sin volver a importarlo.

### Opciones

| Opción | Tipo | Por defecto | Significado |
| --- | --- | --- | --- |
| `behavior.useProduction` | `boolean` | `false` | Reservado para comportamiento específico de producción |
| `configuration.serializer` | `'json' \| 'sensitive'` | `'json'` | `'sensitive'` enmascara las propiedades marcadas con `@LogSensitive()` |
| `configuration.output` | `'console'` | `'console'` | Destino del sink por defecto |
| `configure` | `(builder) => void` | — | Registra tus aspectos, advices y sinks |

### Registro asíncrono

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

También admite `useClass` y `useExisting`, con una clase que implemente
`IAopOptionsFactory`:

```ts
export class AopConfig implements IAopOptionsFactory {
  createOptions(): IAopOptions {
    return { configuration: { serializer: 'json' } };
  }
}

AopModule.forRootAsync({ useClass: AopConfig });
```

### Registrar tus propias piezas

```ts
AopModule.forRoot({
  configure: (builder) =>
    builder
      .addAspect(AuditAspect)   // participa en la cadena
      .addAdvice(AuditAdvice)   // disponible para @UseAdvice({ advice: AuditAdvice })
      .addLogger(PinoSink),     // disponible para @LogMethod({ logger: PinoSink })
});
```

Cada clase se registra como provider bajo su propio token, así que puede tener
sus propias dependencias siempre que sea `@Injectable()`.

---

## 3. Decoradores

### `@LogMethod(opciones?)`

Registra la entrada, el resultado, la salida y la excepción de un método.

```ts
@Injectable()
export class OrdersService {
  @LogMethod()
  find(id: string) {
    return this.repository.findOne(id);
  }
}
```

| Opción | Tipo | Por defecto | Significado |
| --- | --- | --- | --- |
| `logArguments` | `boolean \| number[]` | `true` | `false` no registra argumentos; un array registra solo esas posiciones |
| `logReturn` | `boolean` | `true` | Registra el valor devuelto |
| `logDuration` | `boolean` | `true` | Añade los milisegundos transcurridos |
| `logException` | `boolean` | `true` | Registra el error. Siempre se relanza |
| `trackingId` | `string` | — | Marca de negocio compartida por varias llamadas |
| `requestId` | `string` | — | Identificador fijo de la llamada |
| `resolveRequestId` | `(args, joinPoint) => string` | — | Calcula el identificador desde los argumentos |
| `logger` | token | `AOP_LOGGER` | Sink con el que escribir |
| `order` | `number` | último | Menor se ejecuta antes, más hacia afuera en la cadena |
| `useInterceptor` | `boolean` | `false` | Delega en `AopInterceptor` en vez de envolver el método |

```ts
@LogMethod({
  logArguments: [0],
  logReturn: false,
  resolveRequestId: (args) => `order-${args[0]}`,
})
pay(orderId: string, card: Card) { ... }
```

### `@Retry(opciones?)`

Reinvoca el método mientras el error sea reintentable.

```ts
@Retry({ maxAttempts: 3, delayMs: 200, backoff: 'exponential' })
async fetchRate(): Promise<Rate> {
  return this.http.get('/rates');
}
```

| Opción | Tipo | Por defecto | Significado |
| --- | --- | --- | --- |
| `maxAttempts` | `number` | `3` | Intentos adicionales tras el primer fallo |
| `delayMs` | `number` | `0` | Espera antes de cada reintento |
| `backoff` | `'fixed' \| 'exponential'` | `'fixed'` | `delayMs × 2^intento` si es exponencial |
| `errorTypes` | `Array<new () => Error>` | — | Reintenta solo estas clases de error |
| `handleException` | `boolean` | `false` | `true` traga el error al agotar los intentos |
| `order` | `number` | último | Posición en la cadena |

> **El retardo necesita un método asíncrono.** En uno síncrono el reintento es
> inmediato: pausarlo bloquearía el event loop.

### `@UseAdvice(opciones)`

Ejecuta código tuyo alrededor del método.

```ts
@UseAdvice({ advice: AuditAdvice, context: ['orders'] })
save(order: Order) { ... }
```

| Opción | Tipo | Obligatoria | Significado |
| --- | --- | --- | --- |
| `advice` | clase o token | sí | Advice registrado con `builder.addAdvice()` |
| `context` | `any[]` | no | Datos estáticos que reciben todos los hooks |
| `handleException` | `boolean` | no | `true` traga el error tras `onException` |
| `order` | `number` | no | Posición en la cadena |

El advice implementa `IAdvice`:

```ts
@Injectable()
export class AuditAdvice implements IAdvice {
  onEntry(joinPoint: IJoinPoint, context?: any[]): void {}
  onSuccess(joinPoint: IJoinPoint, context?: any[]): void {}
  onExit(joinPoint: IJoinPoint, context?: any[]): void {}
  onException(joinPoint: IJoinPoint, context: any[] | undefined, error: any): void {}
}
```

### `@Trace(opciones?)`

Abre un span de OpenTelemetry. Requiere `@nestjslatam/aop.aspects.telemetry`.

```ts
@Trace({ resolveAttributes: (args) => ({ 'order.id': args[0] }) })
@LogMethod()
@Retry({ maxAttempts: 3 })
async pay(orderId: string) { ... }
```

| Opción | Tipo | Por defecto | Significado |
| --- | --- | --- | --- |
| `name` | `string` | `Clase.metodo` | Nombre del span |
| `kind` | `SpanKind` | `INTERNAL` | Tipo de span |
| `tracer` | `string` | `@nestjslatam/aop` | Tracer que se pide al proveedor global |
| `attributes` | `Attributes` | — | Atributos estáticos |
| `resolveAttributes` | `(args, joinPoint) => Attributes` | — | Atributos desde los argumentos |
| `recordException` | `boolean` | `true` | Registra la excepción en el span |
| `order` | `number` | `0` | El más externo por defecto |

### `@LogSensitiveParam()` y `@LogSensitive()`

```ts
@LogMethod()
login(user: string, @LogSensitiveParam() password: string) { ... }

export class Customer {
  @LogSensitive()
  taxId: string;
}
```

El primero enmascara un argumento en todos los logs; el segundo enmascara una
propiedad al serializar el payload, y necesita
`configuration.serializer: 'sensitive'`.

---

## 4. Cómo se ejecuta una llamada interceptada

1. El decorador escribe su metadata en el método y, la primera vez, lo
   reemplaza por un envoltorio. Varios decoradores sobre el mismo método
   comparten un único envoltorio.
2. Al invocarlo, el envoltorio construye un `JoinPoint` y pregunta al
   `AspectExecutor` qué aspectos aplican.
3. Los aspectos se ordenan por `order` y se componen en cadena. Cada uno
   ejecuta `onEntry`, llama al siguiente eslabón y, cuando el resultado se
   resuelve, ejecuta `onSuccess` u `onException` y siempre `onExit`.

```
@Trace()      order 0   ── se abre el span ────────────────────────┐
@LogMethod()  order 1      ── se loguea Start Call ───────────┐    │
@Retry()      order 2         ── intento 1, 2, 3 ──────┐      │    │
                                    tu método          │      │    │
                              ─────────────────────────┘      │    │
                           ── se loguea End Call ─────────────┘    │
              ── se cierra el span ────────────────────────────────┘
```

Se respeta el resultado del método: uno síncrono sigue siendo síncrono, una
`Promise` se espera antes de loguear el resultado, y un `Observable` se loguea
cuando el flujo completa.

### El `IJoinPoint`

Todo lo que un aspecto sabe de la llamada:

| Propiedad | Significado |
| --- | --- |
| `args` | Argumentos de la invocación |
| `returnValue` | Valor devuelto, ya resuelto |
| `methodInfo` | `name`, `parameterTypes`, `returnType`, `descriptor` |
| `targetObject` / `targetType` | Instancia y nombre de la clase |
| `elapsedMs` | Milisegundos desde que arrancó la llamada |
| `requestId` / `trackingId` | Identificadores de correlación |
| `traceId` / `spanId` | Los rellena `@Trace()` cuando está activo |
| `proceed()` | Invoca el método original |

### Dos superficies de intercepción

| | Decorador que envuelve | `AopInterceptor` |
| --- | --- | --- |
| Aplica a | cualquier método | handlers de controller y resolver |
| Se activa con | `@LogMethod()` | `@LogMethod({ useInterceptor: true })` |
| Argumentos | los reales | los del contexto de ejecución |
| Datos de transporte | no disponibles | `ExecutionContext`, `x-request-id` |

```ts
{ provide: APP_INTERCEPTOR, useClass: AopInterceptor }
```

El interceptor omite los handlers ya envueltos por un decorador, así que un
método nunca se loguea dos veces.

---

## 5. Formato de log

El sink por defecto escribe una línea por fase con estos marcadores:

| Campo | Significado |
| --- | --- |
| `{datetime}` | Fecha y hora en UTC |
| `{requestid}` | Identificador de la llamada, `None` si no hay |
| `{targettype}` | Nombre de la clase |
| `{methodinfo}` | Nombre del método |
| `{trackingid}` | Marca de negocio |
| `{took}` | Milisegundos transcurridos |
| `{params}` | Argumentos serializados |
| `{returnedvalue}` | Valor devuelto serializado |
| `{error}` | Mensaje del error |

```
2026-09-09T14:30:18:345 - [RequestId: order-7] - [OrdersService.cs, pay] Start Call. Took 0 ms. Args: [{"index":0,"name":"String","value":"7"}].
2026-09-09T14:30:18:387 - [RequestId: order-7] - [OrdersService.cs, pay]. Took 17 ms. Result: Promise, "receipt-7".
2026-09-09T14:30:18:387 - [OrdersService.cs, pay] End Call. Took 17 ms.
```

Con `@Trace()` activo se añaden los ids de correlación:
`[TraceId: 4bf92f…, SpanId: 00f067…]`.

Las plantillas se exportan como constantes (`ON_ENTRY_TEMPLATE`,
`ON_CALL_TEMPLATE`, `ON_EXIT_TEMPLATE`, `ON_EXCEPTION_TEMPLATE` y sus variantes
`_TRACKING`) por si quieres reutilizarlas en tu propio sink.

---

## 6. Sinks

Un sink es cualquier cosa que implemente `IAopLogger`:

```ts
export interface IAopLogger {
  onEntry(context: ILogContext, parameters?: Parameter[]): void;
  onCall(context: ILogContext, result: Result): void;
  onExit(context: ILogContext): void;
  onException(context: ILogContext, error: Error): void;
}
```

`ILogContext` trae `targetType`, `methodInfo`, `requestId`, `trackingId`,
`duration` y, con trazas activas, `traceId` y `spanId`.

| Sink | Paquete | Salida |
| --- | --- | --- |
| `NestLoggerSink` | `aop.aspects.logger` | `Logger` de NestJS, legible. Por defecto |
| `PinoSink` | `aop.aspects.logger.pino` | Una línea JSON por fase, `debug` / `error` |

Registra el tuyo con `builder.addLogger(MiSink)` y apunta el decorador con
`@LogMethod({ logger: MiSink })`.

---

## 7. Serializadores y datos sensibles

```ts
export interface ISerializer {
  serialize(value: any): string;
}
```

| Serializador | Comportamiento |
| --- | --- |
| `JsonSerializer` | `JSON.stringify`, devuelve `[Unserializable]` en vez de lanzar |
| `SensitiveDataJsonSerializer` | Igual, enmascarando las propiedades marcadas con `@LogSensitive()` |

El enmascarado ocurre en dos niveles independientes:

- `@LogSensitiveParam()` enmascara el **argumento**, con cualquier serializador.
- `@LogSensitive()` enmascara la **propiedad**, solo con el serializador
  `sensitive`.

Ambos escriben `**********`, exportado como `SENSITIVE_MASK`.

---

## 8. Tokens de inyección

| Token | Resuelve a |
| --- | --- |
| `AOP_OPTIONS` | Las `IAopOptions` registradas |
| `AOP_EXECUTOR` | El `IAspectExecutor` |
| `AOP_ASPECTS` | Los `IAspect[]` registrados |
| `AOP_LOGGER` | El sink por defecto |
| `AOP_SERIALIZER` | El `ISerializer` activo |
| `AOP_POINT_CUT` | El `IPointCut` |

```ts
constructor(@Inject(AOP_LOGGER) private readonly sink: IAopLogger) {}
```

---

## 9. Crear tu propio aspecto

Un aspecto es una clase con un `token`, un orden y los hooks de frontera:

```ts
import { IAspectContext, IJoinPoint, OnMethodBoundaryAspect } from '@nestjslatam/aop';
import { applyAspect } from '@nestjslatam/aop.nestjs';

const AUDIT_TOKEN = 'aop:aspect:audit';

@Injectable()
export class AuditAspect extends OnMethodBoundaryAspect {
  readonly token = AUDIT_TOKEN;

  protected init(joinPoint: IJoinPoint, context: IAspectContext): void {
    context.handleException = true;       // enruta los errores a onException
    context.state.startedAt = Date.now(); // estado por invocación
  }

  protected onEntry(joinPoint: IJoinPoint): void { ... }
  protected onSuccess(joinPoint: IJoinPoint): void { ... }
  protected onException(joinPoint: IJoinPoint, context: IAspectContext, error: any): void {
    throw error;                          // observa, no tragues
  }
  protected onExit(joinPoint: IJoinPoint): void { ... }
}

export const Audit = (options = {}) => applyAspect(AUDIT_TOKEN, options);
```

Regístralo con `AopModule.forRoot({ configure: (b) => b.addAspect(AuditAspect) })`
y usa `@Audit()` en cualquier método.

**Los aspectos son singletons**, así que no deben guardar estado mutable en
campos: todo lo que pertenece a una invocación va en `context.state`.

Para reintentar dentro de tu aspecto, extiende `OnRetryAspect` e implementa
`canRetry()` y `getDelay()`.

---

## 10. Compatibilidad con la v1

`@nestjslatam/logreflector-lib` 1.1.0 conserva todos los exports de la 1.0.13
con los mismos tipos, y ahora registra `AopModule` por debajo, así que `@Retry`,
`@UseAdvice` y `@Trace` quedan disponibles sin tocar tus imports.

```ts
// sigue funcionando exactamente igual
LogReflectorModule.forRootAsync({ ... });

@LogMethod({ trackingId: 'x', requestId: 'y' })
print(): string { ... }
```

Lo que cambió de comportamiento, porque estaba roto: `@LogMethod()` sin
argumentos ya no lanza, un método que falla ya no se invoca por segunda vez, y
la duración registrada ahora es real en vez de siempre `0`.

Consulta la [guía de migración](migration.md) para el mapa completo de
conceptos desde la librería .NET.
