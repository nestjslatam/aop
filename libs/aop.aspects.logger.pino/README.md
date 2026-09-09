# @nestjslatam/aop.aspects.logger.pino

Structured [pino](https://getpino.io) sink for
[`@nestjslatam/aop.aspects`](https://www.npmjs.com/package/@nestjslatam/aop.aspects).
Port of the `BeyondNet.Aop.Aspects.Logger.Serilog` .NET library.

`pino` is a peer dependency: install the version your application already uses.

```bash
npm install @nestjslatam/aop.aspects.logger.pino pino
```

## Registration

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

Then point the decorator at it:

```ts
@LogMethod({ logger: PinoSink })
find(id: string) { ... }
```

To share the application's pino instance, or to mask with
`SensitiveDataJsonSerializer`, register it as a factory provider instead:

```ts
AopModule.forRoot({
  configure: (builder) => builder.addLogger(PinoSink),
});

// in the module that owns the logger
{
  provide: PinoSink,
  useFactory: (serializer: ISerializer) => new PinoSink(serializer, app.get(Logger)),
  inject: [AOP_SERIALIZER],
}
```

## Output

Serilog attaches the payload as context and keeps the message as a template;
pino takes the payload as an object and the message as a string, which is the
same split:

```json
{"level":20,"msg":"Start Call.","className":"OrdersService","methodName":"find","requestId":"req-1","arguments":"[{\"index\":0,\"name\":\"String\",\"value\":\"1\"}]"}
{"level":20,"msg":"End Call.","className":"OrdersService","methodName":"find","duration":4,"returnType":"String","return":"\"order 1\""}
{"level":50,"msg":"Exception.","className":"OrdersService","methodName":"find","err":{"type":"Error","message":"boom","stack":"..."}}
```

Entry, result and exit are written at `debug` level and exceptions at `error`,
the same levels the Serilog sink uses. Values are serialized with the
configured `ISerializer`, so `@LogSensitiveParam()` and `@LogSensitive()` keep
masking.
