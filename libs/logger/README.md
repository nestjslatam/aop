# @nestjslatam/logreflector-lib

Fachada de compatibilidad de **NestJS AOP**. Reexporta toda la familia
`@nestjslatam/aop.*` y conserva todos los exports de la versión 1.0.13 con los
mismos nombres y tipos.

Si empiezas un proyecto nuevo, instala
[`@nestjslatam/aop.nestjs`](https://www.npmjs.com/package/@nestjslatam/aop.nestjs)
directamente. Este paquete existe para que las aplicaciones ya en marcha sigan
funcionando.

```bash
npm install @nestjslatam/logreflector-lib
```

## Lo que sigue funcionando

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
`ReflectorBuilder`, `LogReflectorDefault`, los tokens `LOG_REFLECTOR_*` y las
plantillas de mensaje conservan su firma.

## Lo que ganas

`LogReflectorModule` ahora registra `AopModule` por debajo, así que los
decoradores nuevos están disponibles sin tocar tus imports:

```ts
import { LogMethod, Retry, UseAdvice } from '@nestjslatam/logreflector-lib';

@LogMethod({ order: 1 })
@Retry({ order: 2, maxAttempts: 3, delayMs: 200 })
async fetchRate(): Promise<Rate> { ... }
```

## Lo que cambió

Tres comportamientos cambiaron porque eran defectos:

| Antes | Ahora |
| --- | --- |
| `@LogMethod()` sin argumentos lanzaba | Funciona; las opciones son opcionales |
| Un método que fallaba se invocaba una segunda vez | El error se loguea una vez y se relanza |
| `Took 0 ms` en todas las líneas | La duración real |

## Documentación

- [Manual de uso](https://github.com/nestjslatam/aop/blob/main/docs/es/usage.md) · [en](https://github.com/nestjslatam/aop/blob/main/docs/en/usage.md)
- [Guía How-To](https://github.com/nestjslatam/aop/blob/main/docs/es/how-to.md) · [en](https://github.com/nestjslatam/aop/blob/main/docs/en/how-to.md)
- [Actualizar desde la v1](https://github.com/nestjslatam/aop/blob/main/docs/es/how-to.md#actualizar-desde-logreflector-lib-v1)

## Licencia

MIT
