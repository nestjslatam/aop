# Arquitectura

## Paquetes

```
@nestjslatam/aop                  primitivas de intercepción, sin dependencia de NestJS
  └── @nestjslatam/aop.aspects            aspectos de logging, reintento y advice
        └── @nestjslatam/aop.aspects.logger   sink, plantillas y serializadores
              ├── @nestjslatam/aop.aspects.logger.pino   sink estructurado con pino
              └── @nestjslatam/aop.nestjs         módulo, decoradores, interceptor
                    ├── @nestjslatam/aop.aspects.telemetry   spans de OpenTelemetry
                    └── @nestjslatam/logreflector-lib   fachada v1
```

Cada paquete depende solo del anterior. `@nestjslatam/aop` y
`@nestjslatam/aop.aspects` no importan `@nestjs/common`, así que se pueden
reutilizar fuera de NestJS.

## Flujo de una llamada interceptada

1. `@LogMethod` escribe la metadata del aspecto en el método y reemplaza el
   descriptor por un envoltorio. Solo envuelve una vez, sin importar cuántos
   decoradores de aspecto lleve el método.
2. Al invocarse, el envoltorio resuelve el `IAspectExecutor`: primero desde la
   propiedad que inyecta NestJS, después desde `AopRegistry`. Sin ninguno de los
   dos, se ejecuta el método original sin tocar nada.
3. El envoltorio construye un `JoinPoint` con los argumentos, la información del
   método, la instancia y un `proceed()` que llama al método original.
4. `AspectExecutor` pregunta al `IPointCut` qué aspectos aplican, los ordena por
   `order` y los compone en una cadena de continuaciones.
5. Cada aspecto ejecuta `onEntry`, invoca el siguiente eslabón y, cuando el
   resultado se resuelve, ejecuta `onSuccess` / `onException` y `onExit`.
   `ResultHelper` hace que eso funcione para un valor, una `Promise` o un
   `Observable`.

## Dónde vive el estado

Los aspectos son singletons del contenedor y no guardan estado mutable. Todo lo
que pertenece a una invocación vive en dos sitios:

- `IJoinPoint`: argumentos, valor de retorno, tiempo transcurrido, request id y
  tracking id.
- `IAspectContext`: opciones resueltas, `handleException` y la bolsa `state` que
  cada aspecto llena en su `init()`.

## Dos superficies de intercepción

| | Decorador que envuelve | `AopInterceptor` |
| --- | --- | --- |
| Aplica a | cualquier método | handlers de controller y resolver |
| Se activa con | `@LogMethod()` | `@LogMethod({ useInterceptor: true })` |
| Argumentos | los reales del método | los del contexto de ejecución |
| Datos de transporte | no disponibles | `ExecutionContext` |

El interceptor ignora los handlers ya envueltos por un decorador, que es lo que
evita que un handler se loguee dos veces cuando ambos están activos.
