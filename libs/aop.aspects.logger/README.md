# @nestjslatam/aop.aspects.logger

Logging sink, message templates and serializers for
[`@nestjslatam/aop.aspects`](https://www.npmjs.com/package/@nestjslatam/aop.aspects).
Port of the `BeyondNet.Aop.Aspects.Logger` .NET library.

| Type | Purpose | .NET origin |
| --- | --- | --- |
| `NestLoggerSink` | Writes through the NestJS `Logger` | `CommonLoggingLogger` |
| `ISerializer` | Serialization contract | `ISerializer` |
| `JsonSerializer` | JSON payloads, never throws | `JsonSerializer` |
| `SensitiveDataJsonSerializer` | Masks properties flagged as sensitive | `SensitiveDataJsonSerializer` + `SensitiveDataResolver` + `SensitiveDataValueProvider` |
| `TemplateHelper` | Fills the message placeholders | inline templates |

`XmlSerializer` and `DataContractSerializer` are not ported: neither has a Node
equivalent without pulling an extra dependency.
