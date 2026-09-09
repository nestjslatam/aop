# Architecture

## Packages

```
@nestjslatam/aop                  interception primitives, no NestJS dependency
  └── @nestjslatam/aop.aspects            logger, retry and advice aspects
        └── @nestjslatam/aop.aspects.logger   sink, templates and serializers
              ├── @nestjslatam/aop.aspects.logger.pino   structured pino sink
              └── @nestjslatam/aop.nestjs         module, decorators, interceptor
                    ├── @nestjslatam/aop.aspects.telemetry   OpenTelemetry spans
                    └── @nestjslatam/logreflector-lib   v1 facade
```

Every package depends only on the one above it. `@nestjslatam/aop` and
`@nestjslatam/aop.aspects` do not import `@nestjs/common`, so they can be reused
outside NestJS.

## Flow of an intercepted call

1. `@LogMethod` writes the aspect metadata on the method and replaces the
   descriptor with a wrapper. It only wraps once, no matter how many aspect
   decorators the method carries.
2. On invocation the wrapper resolves the `IAspectExecutor`: first from the
   property injected by NestJS, then from `AopRegistry`. Without either, the
   original method runs untouched.
3. The wrapper builds a `JoinPoint` with the arguments, the method info, the
   instance and a `proceed()` that calls the original method.
4. `AspectExecutor` asks the `IPointCut` which aspects apply, sorts them by
   `order` and composes them into a chain of continuations.
5. Each aspect runs `onEntry`, invokes the next link and, when the result
   settles, runs `onSuccess` / `onException` and `onExit`. `ResultHelper` makes
   that work for a value, a `Promise` or an `Observable`.

## Where state lives

Aspects are container singletons and hold no mutable state. Everything that
belongs to one invocation lives in two places:

- `IJoinPoint`: arguments, return value, elapsed time, request and tracking id.
- `IAspectContext`: resolved options, `handleException` and the `state` bag each
  aspect fills in `init()`.

## Two interception surfaces

| | Wrapping decorator | `AopInterceptor` |
| --- | --- | --- |
| Applies to | any method | controller and resolver handlers |
| Enabled by | `@LogMethod()` | `@LogMethod({ useInterceptor: true })` |
| Arguments | the real method arguments | the execution context arguments |
| Transport data | not available | `ExecutionContext` |

The interceptor ignores handlers already wrapped by a decorator, which is what
keeps a handler from being logged twice when both are in place.
