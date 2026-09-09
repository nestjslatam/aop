# @nestjslatam/logreflector-lib

Compatibility facade of **NestJS AOP**. It re-exports the whole
`@nestjslatam/aop.*` family and keeps every export of version 1.0.13 with the
same names and types.

If you are starting a new project, install
[`@nestjslatam/aop.nestjs`](https://www.npmjs.com/package/@nestjslatam/aop.nestjs)
directly. This package exists so existing applications keep working.

```bash
npm install @nestjslatam/logreflector-lib
```

## What keeps working

```ts
import { LogMethod, LogReflectorModule, LogSensitiveParam } from '@nestjslatam/logreflector-lib';

@Module({
  imports: [
    LogReflectorModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        behavior: { useProduction: config.get('NODE_ENV') === 'production' },
        configuration: {
          serializer: 'json',
          extension: 'default',
          output: 'console',
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

`LogReflectorModule`, `LogMethod`, `LogSensitiveParam`, `MetadataHelper`,
`TemplateHelper`, `JsonSerializer`, `ISerializer`, `eLogType`, `ILogReflector`,
`IMetadata`, `IOptions`, `IOptionsAsync`, `IOptionsFactory`, `ReflectorFactory`,
`ReflectorBuilder`, `LogReflectorDefault`, the `LOG_REFLECTOR_*` tokens and the
message templates all keep their signature.

## What you gain

`LogReflectorModule` now registers `AopModule` underneath, so the new
decorators are available without touching your imports:

```ts
import { LogMethod, Retry, UseAdvice } from '@nestjslatam/logreflector-lib';

@LogMethod({ order: 1 })
@Retry({ order: 2, maxAttempts: 3, delayMs: 200 })
async fetchRate(): Promise<Rate> { ... }
```

## What changed

Three behaviours changed because they were defects:

| Before | Now |
| --- | --- |
| `@LogMethod()` without arguments threw | It works; the options are optional |
| A failing method was invoked a second time | The error is logged once and rethrown |
| `Took 0 ms` on every line | The real duration |

## Documentation

- [Usage manual](https://github.com/nestjslatam/aop/blob/main/docs/en/usage.md) · [Manual de uso](https://github.com/nestjslatam/aop/blob/main/docs/es/usage.md)
- [How-To guide](https://github.com/nestjslatam/aop/blob/main/docs/en/how-to.md) · [Guía How-To](https://github.com/nestjslatam/aop/blob/main/docs/es/how-to.md)
- [Upgrading from v1](https://github.com/nestjslatam/aop/blob/main/docs/en/how-to.md#upgrade-from-logreflector-lib-v1)

## License

MIT
