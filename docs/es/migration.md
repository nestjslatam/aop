# Migración de BeyondNet.Aop (.NET) a NestJS

Este documento registra cómo se portó cada concepto de la solución .NET
`BeyondNet.Aop`, en qué paquete vive y cuál es su nombre final.

La regla que guió cada decisión: **no reimplementar lo que NestJS ya provee**.
Donde NestJS tiene un mecanismo nativo, gana el nativo aunque la librería .NET
tuviera el suyo propio.

## Mapa de paquetes

| Proyecto .NET | Paquete | Carpeta |
| --- | --- | --- |
| `BeyondNet.Aop` | `@nestjslatam/aop` | `libs/aop` |
| `BeyondNet.Aop.Aspects` | `@nestjslatam/aop.aspects` | `libs/aop.aspects` |
| `BeyondNet.Aop.Aspects.Logger` | `@nestjslatam/aop.aspects.logger` | `libs/aop.aspects.logger` |
| `BeyondNet.Aop.Aspects.Logger.Serilog` | `@nestjslatam/aop.aspects.logger.pino` | `libs/aop.aspects.logger.pino` |
| `BeyondNet.Aop.DispatchProxy` + `...DependencyInjection.Aspects.Installer` | `@nestjslatam/aop.nestjs` | `libs/aop.nestjs` |
| — (nuevo) | `@nestjslatam/aop.aspects.telemetry` | `libs/aop.aspects.telemetry` |
| — (compatibilidad v1) | `@nestjslatam/logreflector-lib` | `libs/logger` |

El nombre lógico de la familia es `nestjslatam.aop`, `nestjslatam.aop.aspects`,
`nestjslatam.aop.aspects.logger`, `nestjslatam.aop.aspects.logger.pino` y
`nestjslatam.aop.nestjs`. El scope de npm ya
aporta `nestjslatam`, por eso el nombre del paquete no lo repite.

## Mapa de conceptos

| Concepto .NET | Equivalente NestJS | Decisión | Paquete | Nombre final |
| --- | --- | --- | --- | --- |
| `IJoinPoint` / `JoinPoint` | ninguno (`ExecutionContext` solo cubre handlers) | portar | `aop` | `IJoinPoint` / `JoinPoint` |
| `MethodInfo`, `TargetType` | `Reflect` + `design:paramtypes` | adaptar | `aop` | `IMethodInfo` |
| `IPointCut` / `PointCut` | `SetMetadata` + `Reflector` | adoptar nativo | `aop` | `IPointCut` / `AspectPointCut` |
| `IAspectExecutor` / `AspectExecutor` | ninguno | portar | `aop` | `IAspectExecutor` / `AspectExecutor` |
| `AbstractAspect<T>` | decoradores + metadata | portar | `aop` | `BaseAspect` |
| `BaseAspectAttribute.Order` | opciones del decorador | adaptar | `aop` | `IAspectOptions.order` |
| `OnMethodBoundaryAspect<T>` | ninguno | portar | `aop` | `OnMethodBoundaryAspect` |
| `OnRetryAspect<T>` | operadores de reintento de RxJS | adaptar | `aop` | `OnRetryAspect` |
| `SetNext` / `GetNext` | composición de interceptores | adaptar | `aop` | `AspectNext` |
| `AopProxy` / `AopProxyCreator` (`DispatchProxy`) | `NestInterceptor` + envoltura del descriptor | adoptar nativo + adaptar | `aop.nestjs` | `AopInterceptor` + decoradores |
| `ServiceCollectionExtension.AddAop()` | `DynamicModule` | adoptar nativo | `aop.nestjs` | `AopModule.forRoot/forRootAsync` |
| `IAopAspectsBuilder` / `AopAspectsBuilder` | providers | adaptar | `aop.nestjs` | `IAopAspectsBuilder` / `AopAspectsBuilder` |
| `AddKeyedTransient` (DI con clave) | token de clase + `ModuleRef` | adaptar | `aop.nestjs` | — |
| `IFactory<T>` / `Factory<T>` | `ModuleRef` | adoptar nativo | — | eliminado |
| `IEvaluator` / `Evaluator` | ninguno sin `eval` | reemplazar | `aop.aspects` | `ILoggerAspectOptions.resolveRequestId` |
| `LoggerAspect` + `LoggerAspectAttribute` | — | portar | `aop.aspects` / `aop.nestjs` | `LoggerAspect` / `@LogMethod` |
| `RetryAspect` + `RetryAspectAttribute` | — | portar | `aop.aspects` / `aop.nestjs` | `RetryAspect` / `@Retry` |
| `AdviceAspect` + `AdviceAspectAttribute` | — | portar | `aop.aspects` / `aop.nestjs` | `AdviceAspect` / `@UseAdvice` |
| `IAdvice` / `Advice` | — | portar | `aop.aspects` | `IAdvice` / `Advice` |
| `Argument` / `Return` | — | adaptar a los modelos existentes | `aop.aspects` | `Parameter` / `Result` |
| `ILogger` (seis sobrecargas de `OnExit`) | — | adaptar a cuatro fases | `aop.aspects` | `IAopLogger` |
| `ISerializer` | — | ya existía | `aop.aspects.logger` | `ISerializer` |
| `JsonSerializer` | — | portar | `aop.aspects.logger` | `JsonSerializer` |
| `SensitiveDataJsonSerializer` + `SensitiveDataResolver` + `SensitiveDataValueProvider` | replacer de `JSON.stringify` | portar, colapsado en un tipo | `aop.aspects.logger` | `SensitiveDataJsonSerializer` |
| `XmlSerializer` / `DataContractSerializer` | ninguno sin dependencia nueva | no se porta | — | — |
| `CommonLoggingLogger` | `Logger` de `@nestjs/common` | adoptar nativo | `aop.aspects.logger` | `NestLoggerSink` |
| `SerilogLogger` | pino | portar | `aop.aspects.logger.pino` | `PinoSink` |
| `Stopwatch` | `Date.now()` | adaptar | `aop` | `IJoinPoint.elapsedMs` |

## Decisiones

### D1 — `DispatchProxy` no se replica

.NET construye un proxy dinámico por interfaz. NestJS tiene dos puntos de
intercepción nativos y el port usa ambos:

- **Envoltura del descriptor** (`@LogMethod`, `@Retry`, `@UseAdvice`): funciona
  en cualquier método, de un provider, un controller o un resolver. Es el modo
  por defecto.
- **`AopInterceptor`**: para handlers declarados con `useInterceptor: true`,
  donde el `ExecutionContext` trae datos de transporte como la cabecera
  `x-request-id`.

Se descartó interceptar con `DiscoveryService` y proxies de instancia: rompe
`this`, complica los providers con scope de request y no aporta nada al objetivo
de decorar métodos.

El interceptor omite los handlers ya envueltos por un decorador, así nunca se
loguea dos veces.

### D2 — `Evaluator` se reemplaza por una función

`LoggerAspectAttribute.Expression` es una cadena compilada con
`System.Linq.Dynamic.Core`. Node no tiene un equivalente que no implique `eval`
o una nueva dependencia de parser, así que la opción pasó a ser una función:

```ts
@LogMethod({ resolveRequestId: (args) => `order-${args[0]}` })
```

Es type-safe, no añade dependencias y nunca evalúa cadenas arbitrarias.

### D3 — Síncrono, asíncrono y Observable

La librería .NET es totalmente síncrona. Aquí cada hook funciona sobre un valor
plano, una `Promise` y un `Observable`, y se conserva la forma del valor
devuelto: un método síncrono sigue siendo síncrono. Lo implementa
`ResultHelper` en `@nestjslatam/aop`.

Consecuencia para `@Retry`: `delayMs` requiere un método asíncrono u Observable.
En un método síncrono el reintento es inmediato, porque pausarlo bloquearía el
event loop.

## Otras divergencias

- **Aspectos sin estado.** Los providers de NestJS son singletons; guardar
  estado por invocación en campos, como hace `RetryAspect.Count` en .NET, se
  filtra entre llamadas. El estado vive en `IAspectContext`.
- **`onExit` siempre se ejecuta.** El `OnRetryAspect` de .NET omite `OnExit` al
  agotar los reintentos; aquí se ejecuta una vez en todos los caminos.
- **`LogArguments`.** .NET filtra por nombre de parámetro; TypeScript no
  conserva los nombres en runtime, así que `logArguments` acepta `true` o una
  lista de índices.
- **`Advice.OnException`.** El default de .NET asigna `default(T)` al retorno de
  los value types; TypeScript no tiene esa noción, así que el valor de retorno
  queda intacto.
- **`AbstractAspect` se llama `BaseAspect`.** NestJS usa el prefijo `Base*` en su
  propia API (`BaseExceptionFilter`, `BaseRpcExceptionFilter`); `Abstract*` es
  convención de .NET y Java. `OnMethodBoundaryAspect` y `OnRetryAspect` conservan
  su nombre: son términos del dominio AOP, no convenciones de lenguaje.
- **`@nestjslatam/core-lib`.** La dependencia se incorporó como
  `getUtcDateTimeFormatted` dentro de `@nestjslatam/aop.aspects.logger` porque el
  paquete ya no se resuelve desde el registro público de npm. El formato del
  timestamp no cambia.

## Más allá de la librería .NET

`@nestjslatam/aop.aspects.telemetry` no tiene equivalente en `BeyondNet.Aop`.
Aporta `TraceAspect` y el decorador `@Trace()`: un span de OpenTelemetry por
llamada interceptada, activo mientras el método corre, con el `traceId` /
`spanId` entregados al aspecto de logging para que cada línea de log los lleve.
Eso es lo que correlaciona los logs de Loki con las trazas de Tempo en Grafana.


## Compatibilidad con v1

`@nestjslatam/logreflector-lib` conserva todos los exports públicos de la
v1.0.13: `LogReflectorModule`, `LogMethod`, `LogSensitiveParam`,
`MetadataHelper`, `TemplateHelper`, `JsonSerializer`, `ISerializer`, `eLogType`,
`ILogReflector`, `IMetadata`, `IOptions`, `IOptionsAsync`, `IOptionsFactory`,
`ReflectorFactory`, `ReflectorBuilder`, `LogReflectorDefault` y los tokens
`LOG_REFLECTOR_*`, además de las plantillas de mensaje. También reexporta toda
la familia `aop.*`, así que `@Retry` y `@UseAdvice` están disponibles sin tocar
los imports.

`LogReflectorModule.forRoot` y `forRootAsync` ahora registran `AopModule` por
debajo. Los cambios son aditivos; la versión pasa a 1.1.0.

Comportamientos corregidos en el camino, todos observables desde código v1:

1. `@LogMethod()` sin argumentos lanzaba excepción; ahora las opciones son
   opcionales.
2. La rama `catch` reinvocaba el método fallido perdiendo `this`; ahora el error
   se loguea y se relanza una sola vez.
3. La duración siempre era `0`; ahora se mide desde el inicio de la llamada.
4. `forRootAsync` fallaba cuando faltaba `imports`.
5. `ReflectorFactory.getLogger()` devolvía `undefined` con cualquier
   configuración distinta de `extension: 'default'` con `serializer: 'json'`.
6. `JsonSerializer` lanzaba con estructuras circulares, rompiendo el método
   interceptado.