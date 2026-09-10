# @nestjslatam/aop.nestjs

Integración con NestJS de
[`@nestjslatam/aop`](https://www.npmjs.com/package/@nestjslatam/aop).
Port de `BeyondNet.Aop.DispatchProxy` y del instalador de
`Microsoft.Extensions.DependencyInjection`.

## Registro

```ts
import { AopModule } from '@nestjslatam/aop.nestjs';

@Module({
  imports: [AopModule.forRoot({ configuration: { serializer: 'sensitive' } })],
})
export class AppModule {}
```

También está disponible `forRootAsync({ useFactory, inject })`, además de
`configure` para registrar tus propios aspectos, advices y sinks:

```ts
AopModule.forRoot({
  configure: (builder) => builder.addAdvice(AuditAdvice).addAspect(AuditAspect),
});
```

## Decoradores

| Decorador | Efecto |
| --- | --- |
| `@LogMethod(opciones?)` | Registra entrada, resultado, salida y excepción |
| `@Retry(opciones?)` | Reintenta el método mientras el error sea reintentable |
| `@UseAdvice({ advice })` | Ejecuta un advice propio alrededor del método |
| `@LogSensitiveParam()` | Enmascara un argumento en los logs |
| `@LogSensitive()` | Enmascara una propiedad al serializar |

Los decoradores se pueden combinar: comparten una única intercepción y se
ejecutan como una sola cadena ordenada por `order`.

## Dos superficies de intercepción

- **Providers, controllers y resolvers**: el decorador envuelve el método. Es el
  modo por defecto y la única opción para métodos que no son handlers.
- **Handlers de controller y resolver**: con `useInterceptor: true` el decorador
  solo escribe metadata y es `AopInterceptor` quien ejecuta los aspectos, lo que
  da acceso al `ExecutionContext` (por ejemplo, a la cabecera `x-request-id`).
  Se registra con `APP_INTERCEPTOR`.

`AopInterceptor` omite los handlers ya envueltos por un decorador, así que un
método nunca se loguea dos veces.

## Fuera del contenedor

Los decoradores inyectan el executor como propiedad de la clase. Cuando la clase
no la gestiona NestJS, el executor se toma de `AopRegistry`, que `AopModule`
rellena al arrancar. Si no hay ninguno de los dos, se ejecuta el método original
sin tocar nada.

## Documentación

[Manual de uso](https://github.com/nestjslatam/aop/blob/main/docs/es/usage.md) ·
[Guía How-To](https://github.com/nestjslatam/aop/blob/main/docs/es/how-to.md)

## Licencia

MIT
