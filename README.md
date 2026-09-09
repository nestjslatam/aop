# NestJS AOP

**Aspect-oriented programming for NestJS.** Add logging, retries, auditing and
OpenTelemetry tracing to any method with a decorator, without touching what the
method does.

TypeScript port of the [BeyondNet.Aop](https://github.com/beyondnetperu) .NET
library, rebuilt around the mechanisms NestJS already provides.

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

That method is now traced, logged with its arguments, its result and its real
duration, and retried on failure. Its body never changed.

---

## Install

```bash
npm install @nestjslatam/aop.nestjs
```

## Quick start

**1. Register the module once**, in the root module. It is global.

```ts
import { Module } from '@nestjs/common';
import { AopModule } from '@nestjslatam/aop.nestjs';

@Module({ imports: [AopModule.forRoot()] })
export class AppModule {}
```

**2. Decorate a method.**

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

**3. Run it.**

```
2026-09-09T14:30:18:345 - [RequestId: None] - [OrdersService.cs, find] Start Call. Took 0 ms. Args: [{"index":0,"name":"String","value":"7"}].
2026-09-09T14:30:18:357 - [RequestId: None] - [OrdersService.cs, find]. Took 12 ms. Result: Promise, {"id":"7","total":90}.
2026-09-09T14:30:18:357 - [OrdersService.cs, find] End Call. Took 12 ms.
```

That is the whole setup. Everything below is optional.

---

## Documentation

| Guide | What it is for |
| --- | --- |
| [Usage manual](docs/en/usage.md) · [Manual de uso](docs/es/usage.md) | Complete reference: every decorator, option, token and extension point |
| [How-To guide](docs/en/how-to.md) · [Guía How-To](docs/es/how-to.md) | Task recipes: mask passwords, retry an API, send logs to Loki, trace with Tempo, write your own aspect, test decorated code |
| [Architecture](docs/en/architecture.md) · [Arquitectura](docs/es/architecture.md) | How an intercepted call runs and where the state lives |
| [Migration from .NET](docs/en/migration.md) · [Migración desde .NET](docs/es/migration.md) | Concept map from `BeyondNet.Aop`, decisions and divergences |

New to the library? Read the [quick start](#quick-start), then jump to the
[How-To guide](docs/en/how-to.md) and come back to the manual when you need the
details.

---

## What you can do

| Need | Decorator | Recipe |
| --- | --- | --- |
| Know what a method receives, returns and how long it takes | `@LogMethod()` | [Log a service](docs/en/how-to.md#log-everything-a-service-does) |
| Tie together the logs of one request | `@LogMethod({ resolveRequestId })` | [Correlate logs](docs/en/how-to.md#correlate-the-logs-of-one-request) |
| Keep secrets out of the logs | `@LogSensitiveParam()` · `@LogSensitive()` | [Mask sensitive data](docs/en/how-to.md#keep-passwords-out-of-the-logs) |
| Survive a flaky dependency | `@Retry()` | [Retry a call](docs/en/how-to.md#retry-a-call-that-fails-intermittently) |
| Query the logs in Grafana | `PinoSink` | [Logs to Loki](docs/en/how-to.md#send-the-logs-to-loki-and-see-them-in-grafana) |
| Trace a call and link it to its logs | `@Trace()` | [Tracing](docs/en/how-to.md#trace-a-call-and-jump-from-the-log-to-the-trace) |
| Run your own code around a method | `@UseAdvice()` | [Audit with an advice](docs/en/how-to.md#audit-who-changes-what-with-your-own-advice) |
| Anything else that cuts across the code | your own aspect | [Build an aspect](docs/en/how-to.md#build-an-aspect-of-your-own) |

Every aspect works on synchronous methods, `Promise` and `Observable`, and
preserves the shape of the returned value.

---

## Packages

Install `@nestjslatam/aop.nestjs`; it brings the first three with it.

| Package | Purpose |
| --- | --- |
| [`@nestjslatam/aop`](libs/aop) | Interception core: join point, point cut, aspect executor. No NestJS dependency |
| [`@nestjslatam/aop.aspects`](libs/aop.aspects) | Logger, retry and advice aspects |
| [`@nestjslatam/aop.aspects.logger`](libs/aop.aspects.logger) | Default sink, templates and serializers |
| [`@nestjslatam/aop.nestjs`](libs/aop.nestjs) | `AopModule`, decorators and interceptor |
| [`@nestjslatam/aop.aspects.logger.pino`](libs/aop.aspects.logger.pino) | Structured pino sink, ready for Loki. Optional |
| [`@nestjslatam/aop.aspects.telemetry`](libs/aop.aspects.telemetry) | OpenTelemetry spans correlated with the logs. Optional |
| [`@nestjslatam/logreflector-lib`](libs/logger) | v1 facade, re-exports the whole family |

---

## Already using logreflector-lib?

Version 1.1.0 keeps every export of 1.0.13 with the same types and registers
`AopModule` underneath, so `@Retry`, `@UseAdvice` and `@Trace` are available
without touching your imports. Nothing to migrate.

```bash
npm install @nestjslatam/logreflector-lib@^1.1.0
```

See [upgrading from v1](docs/en/how-to.md#upgrade-from-logreflector-lib-v1).

---

## Development

This repository is the monorepo of the family plus a demo application in
`src/` (a controller and a GraphQL resolver that exercise logging and retry end
to end).

```bash
npm install
npm run build:libs   # builds every package into dist/libs and links them locally
npm start            # runs the demo app against the built packages
npm test             # unit tests
npm run test:e2e     # controller and resolver end to end
npm run lint
```

`build:libs` links `dist/libs/*` into `node_modules/@nestjslatam/*`, which is
how the compiled demo resolves the packages by name. It runs automatically
before `npm run build` and `npm start`. Tests and the editor resolve the same
names against the sources, through the `paths` of `tsconfig.json`.

---

## Status

| Feature | State |
| --- | --- |
| Method decorator, parameter and property decorators | ✅ |
| Retry with fixed and exponential backoff | ✅ |
| Custom advices and custom aspects | ✅ |
| Aspect ordering and chaining | ✅ |
| Sync, `Promise` and `Observable` methods | ✅ |
| NestJS `Logger` sink | ✅ |
| Structured pino sink | ✅ |
| OpenTelemetry spans with log correlation | ✅ |
| Class decorator | ⬜ |
| XML output | ⬜ |

Maintained by [@nestjslatam](https://github.com/nestjslatam) · supported by
[@beyondnetperu](https://github.com/beyondnetperu).

## License

MIT
