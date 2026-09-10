# @nestjslatam/aop.aspects.logger.pino

Sink estructurado con [pino](https://getpino.io) para
[`@nestjslatam/aop.aspects`](https://www.npmjs.com/package/@nestjslatam/aop.aspects).
Port de la librería .NET `BeyondNet.Aop.Aspects.Logger.Serilog`.

`pino` es una peer dependency: instala la versión que ya use tu aplicación.

```bash
npm install @nestjslatam/aop.aspects.logger.pino pino
```

## Registro

```ts
import { AopModule } from '@nestjslatam/aop.nestjs';
import { PinoSink } from '@nestjslatam/aop.aspects.logger.pino';

@Module({
  imports: [
    AopModule.forRoot({ configure: (builder) => builder.addLogger(PinoSink) }),
  ],
})
export class AppModule {}
```

Después apunta el decorador hacia él:

```ts
@LogMethod({ logger: PinoSink })
find(id: string) { ... }
```

Para compartir la instancia de pino de la aplicación, o para enmascarar con
`SensitiveDataJsonSerializer`, regístralo como factory provider:

```ts
{
  provide: PinoSink,
  useFactory: (serializer: ISerializer) => new PinoSink(serializer, app.get(Logger)),
  inject: [AOP_SERIALIZER],
}
```

## Salida

Serilog adjunta el payload como contexto y deja el mensaje como plantilla; pino
recibe el payload como objeto y el mensaje como cadena, que es el mismo reparto:

```json
{"level":20,"msg":"Start Call.","className":"OrdersService","methodName":"find","requestId":"req-1","arguments":"[{\"index\":0,\"name\":\"String\",\"value\":\"1\"}]"}
{"level":20,"msg":"End Call.","className":"OrdersService","methodName":"find","duration":4,"returnType":"String","return":"\"order 1\""}
{"level":50,"msg":"Exception.","className":"OrdersService","methodName":"find","err":{"type":"Error","message":"boom","stack":"..."}}
```

Entrada, resultado y salida se escriben a nivel `debug` y las excepciones a
`error`, los mismos niveles que usa el sink de Serilog. Los valores se
serializan con el `ISerializer` configurado, así que `@LogSensitiveParam()` y
`@LogSensitive()` siguen enmascarando.

## Documentación

[Guía How-To: logs a Loki](https://github.com/nestjslatam/aop/blob/main/docs/es/how-to.md#mandar-los-logs-a-loki-y-verlos-en-grafana) ·
[Manual de uso](https://github.com/nestjslatam/aop/blob/main/docs/es/usage.md)

## Licencia

MIT
