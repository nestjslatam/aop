# @nestjslatam/aop.aspects.logger

Sink de logging, plantillas de mensaje y serializadores para
[`@nestjslatam/aop.aspects`](https://www.npmjs.com/package/@nestjslatam/aop.aspects).
Port de la librería .NET `BeyondNet.Aop.Aspects.Logger`.

| Tipo | Para qué | Origen .NET |
| --- | --- | --- |
| `NestLoggerSink` | Escribe a través del `Logger` de NestJS | `CommonLoggingLogger` |
| `ISerializer` | Contrato de serialización | `ISerializer` |
| `JsonSerializer` | Payloads JSON, nunca lanza | `JsonSerializer` |
| `SensitiveDataJsonSerializer` | Enmascara las propiedades marcadas como sensibles | `SensitiveDataJsonSerializer` + `SensitiveDataResolver` + `SensitiveDataValueProvider` |
| `TemplateHelper` | Rellena los marcadores del mensaje | plantillas embebidas |

`XmlSerializer` y `DataContractSerializer` no se portan: ninguno tiene
equivalente en Node sin arrastrar una dependencia extra.

## Documentación

[Manual de uso](https://github.com/nestjslatam/aop/blob/main/docs/es/usage.md) ·
[Guía How-To](https://github.com/nestjslatam/aop/blob/main/docs/es/how-to.md)

## Licencia

MIT
