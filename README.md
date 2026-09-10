# NestJS AOP

**Español** · [English](README.en.md)

**Programación orientada a aspectos para NestJS.** Añade logging, reintentos,
auditoría y trazas de OpenTelemetry a cualquier método con un decorador, sin
tocar lo que el método hace.

Port en TypeScript de la librería .NET [BeyondNet.Aop](https://github.com/beyondnetperu),
reconstruida sobre los mecanismos que NestJS ya ofrece.

```ts
@Injectable()
export class OrdersService {
  @Trace()
  @LogMethod({ resolveRequestId: (args) => `order-${args[0]}` })
  @Retry({ maxAttempts: 3, delayMs: 200, backoff: 'exponential' })
  async pay(orderId: string): Promise<Receipt> {
    return this.gateway.charge(orderId);
  }
}
```

Ese método queda trazado, logueado con sus argumentos, su resultado y su
duración real, y con reintentos ante fallo. Su cuerpo no cambió.

---

## Instalación

```bash
npm install @nestjslatam/aop.nestjs
```

## Primeros pasos

**1. Registra el módulo una vez**, en el módulo raíz. Es global.

```ts
import { Module } from '@nestjs/common';
import { AopModule } from '@nestjslatam/aop.nestjs';

@Module({ imports: [AopModule.forRoot()] })
export class AppModule {}
```

**2. Decora un método.**

```ts
import { Injectable } from '@nestjs/common';
import { LogMethod } from '@nestjslatam/aop.nestjs';

@Injectable()
export class OrdersService {
  @LogMethod()
  find(id: string) {
    return this.repository.findOne(id);
  }
}
```

**3. Ejecútalo.**

```
2026-09-09T14:30:18:345 - [RequestId: None] - [OrdersService.cs, find] Start Call. Took 0 ms. Args: [{"index":0,"name":"String","value":"7"}].
2026-09-09T14:30:18:357 - [RequestId: None] - [OrdersService.cs, find]. Took 12 ms. Result: Promise, {"id":"7","total":90}.
2026-09-09T14:30:18:357 - [OrdersService.cs, find] End Call. Took 12 ms.
```

Eso es toda la configuración. Lo que sigue es opcional.

---

## Documentación

| Guía | Para qué sirve |
| --- | --- |
| [Manual de uso](docs/es/usage.md) · [en](docs/en/usage.md) | Referencia completa: cada decorador, opción, token y punto de extensión |
| [Guía How-To](docs/es/how-to.md) · [en](docs/en/how-to.md) | Recetas por tarea: ocultar contraseñas, reintentar una API, mandar logs a Loki, trazar con Tempo, crear tu propio aspecto, testear código decorado |
| [Arquitectura](docs/es/architecture.md) · [en](docs/en/architecture.md) | Cómo se ejecuta una llamada interceptada y dónde vive el estado |
| [Migración desde .NET](docs/es/migration.md) · [en](docs/en/migration.md) | Mapa de conceptos desde `BeyondNet.Aop`, decisiones y divergencias |
| [Publicación](docs/es/releasing.md) · [en](docs/en/releasing.md) | Cómo funcionan las versiones y la publicación en npm, con Changesets |

¿Primera vez con la librería? Lee los [primeros pasos](#primeros-pasos), salta a
la [guía How-To](docs/es/how-to.md) y vuelve al manual cuando necesites el
detalle.

---

## Qué puedes hacer

| Necesidad | Decorador | Receta |
| --- | --- | --- |
| Saber qué recibe un método, qué devuelve y cuánto tarda | `@LogMethod()` | [Loguear un servicio](docs/es/how-to.md#loguear-todo-lo-que-hace-un-servicio) |
| Atar entre sí los logs de una misma petición | `@LogMethod({ resolveRequestId })` | [Correlacionar logs](docs/es/how-to.md#correlacionar-los-logs-de-una-petición) |
| Mantener los secretos fuera de los logs | `@LogSensitiveParam()` · `@LogSensitive()` | [Enmascarar datos sensibles](docs/es/how-to.md#mantener-las-contraseñas-fuera-de-los-logs) |
| Sobrevivir a una dependencia inestable | `@Retry()` | [Reintentar una llamada](docs/es/how-to.md#reintentar-una-llamada-que-falla-de-forma-intermitente) |
| Consultar los logs en Grafana | `PinoSink` | [Logs a Loki](docs/es/how-to.md#mandar-los-logs-a-loki-y-verlos-en-grafana) |
| Trazar una llamada y enlazarla con sus logs | `@Trace()` | [Trazas](docs/es/how-to.md#trazar-una-llamada-y-saltar-del-log-a-la-traza) |
| Ejecutar código propio alrededor de un método | `@UseAdvice()` | [Auditar con un advice](docs/es/how-to.md#auditar-quién-cambia-qué-con-tu-propio-advice) |
| Cualquier otra cosa que atraviese el código | tu propio aspecto | [Construir un aspecto](docs/es/how-to.md#construir-un-aspecto-propio) |

Todos los aspectos funcionan sobre métodos síncronos, `Promise` y `Observable`,
y conservan la forma del valor devuelto.

---

## Paquetes

Instala `@nestjslatam/aop.nestjs`; arrastra los tres primeros.

| Paquete | Para qué |
| --- | --- |
| [`@nestjslatam/aop`](libs/aop) | Núcleo de intercepción: join point, point cut, ejecutor de aspectos. Sin dependencia de NestJS |
| [`@nestjslatam/aop.aspects`](libs/aop.aspects) | Aspectos de logging, reintento y advice |
| [`@nestjslatam/aop.aspects.logger`](libs/aop.aspects.logger) | Sink por defecto, plantillas y serializadores |
| [`@nestjslatam/aop.nestjs`](libs/aop.nestjs) | `AopModule`, decoradores e interceptor |
| [`@nestjslatam/aop.aspects.logger.pino`](libs/aop.aspects.logger.pino) | Sink estructurado con pino, listo para Loki. Opcional |
| [`@nestjslatam/aop.aspects.telemetry`](libs/aop.aspects.telemetry) | Spans de OpenTelemetry correlacionados con los logs. Opcional |
| [`@nestjslatam/logreflector-lib`](libs/logger) | Fachada v1, reexporta toda la familia |

---

## ¿Ya usas logreflector-lib?

La versión 1.1.0 conserva todos los exports de la 1.0.13 con los mismos tipos y
registra `AopModule` por debajo, así que `@Retry`, `@UseAdvice` y `@Trace` están
disponibles sin tocar tus imports. No hay nada que migrar.

```bash
npm install @nestjslatam/logreflector-lib@^1.1.0
```

Consulta [actualizar desde la v1](docs/es/how-to.md#actualizar-desde-logreflector-lib-v1).

---

## Desarrollo

Este repositorio es el monorepo de la familia más una aplicación de demo en
`src/` (un controller y un resolver de GraphQL que ejercitan logging y reintento
de extremo a extremo).

```bash
npm install
npm run build:libs   # compila cada paquete en libs/<pkg>/dist
npm start            # levanta la app de demo contra los paquetes compilados
npm test             # tests unitarios
npm run test:e2e     # controller y resolver de extremo a extremo
npm run lint
```

Es un workspace de npm: `npm install` enlaza cada paquete en
`node_modules/@nestjslatam/*`, de modo que la demo los resuelve por su nombre
publicado. Los tests y el editor resuelven esos mismos nombres contra las
fuentes, mediante los `paths` de `tsconfig.json`.

Los cambios que alcanzan a un paquete publicado necesitan un changeset:

```bash
npm run changeset
```

CI ejecuta lint, tests unitarios, tests de extremo a extremo y el build en Node
18, 20 y 22, y la publicación es automática al mergear el pull request de
versionado. Ver [Publicación](docs/es/releasing.md).

---

## Estado

| Funcionalidad | Estado |
| --- | --- |
| Decorador de método, de parámetro y de propiedad | ✅ |
| Reintentos con backoff fijo y exponencial | ✅ |
| Advices y aspectos propios | ✅ |
| Orden y encadenamiento de aspectos | ✅ |
| Métodos síncronos, `Promise` y `Observable` | ✅ |
| Sink del `Logger` de NestJS | ✅ |
| Sink estructurado con pino | ✅ |
| Spans de OpenTelemetry correlacionados con los logs | ✅ |
| Decorador de clase | ⬜ |
| Salida XML | ⬜ |

Mantenido por [@nestjslatam](https://github.com/nestjslatam) · con el apoyo de
[@beyondnetperu](https://github.com/beyondnetperu).

## Licencia

MIT
