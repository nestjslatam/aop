# @nestjslatam/aop.nestjs

NestJS integration for [`@nestjslatam/aop`](https://www.npmjs.com/package/@nestjslatam/aop).
Port of `BeyondNet.Aop.DispatchProxy` and of the
`Microsoft.Extensions.DependencyInjection` installer.

## Registration

```ts
import { AopModule } from '@nestjslatam/aop.nestjs';

@Module({
  imports: [AopModule.forRoot({ configuration: { serializer: 'sensitive' } })],
})
export class AppModule {}
```

`forRootAsync({ useFactory, inject })` is also available, plus `configure` to
register your own aspects, advices and sinks:

```ts
AopModule.forRoot({
  configure: (builder) => builder.addAdvice(AuditAdvice).addAspect(AuditAspect),
});
```

## Decorators

| Decorator | Effect |
| --- | --- |
| `@LogMethod(options?)` | Logs entry, result, exit and exception |
| `@Retry(options?)` | Retries the method while the error is retryable |
| `@UseAdvice({ advice })` | Runs a custom advice around the method |
| `@LogSensitiveParam()` | Masks an argument in the logs |
| `@LogSensitive()` | Masks a property when serializing |

Decorators can be combined; they share a single interception and run as one
chain ordered by `order`.

## Two interception surfaces

- **Providers, controllers and resolvers**: the decorator wraps the method. This
  is the default and the only option for methods that are not handlers.
- **Controller and resolver handlers**: with `useInterceptor: true` the
  decorator only writes metadata and `AopInterceptor` runs the aspects, which
  gives access to the `ExecutionContext` (for example the `x-request-id`
  header). Register it with `APP_INTERCEPTOR`.

`AopInterceptor` skips handlers already wrapped by a decorator, so a method
never gets logged twice.

## Outside the container

The decorators inject the executor as a property of the class. When the class is
not managed by NestJS the executor is taken from `AopRegistry`, which
`AopModule` fills on start up. If neither is available the original method runs
untouched.
