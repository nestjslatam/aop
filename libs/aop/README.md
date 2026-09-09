# @nestjslatam/aop

AOP core for NestJS. Port of the `BeyondNet.Aop` .NET library.

Provides the interception primitives and nothing else: it does not depend on
`@nestjs/common`, so it can be reused outside NestJS.

## Contents

| Type | Purpose | .NET origin |
| --- | --- | --- |
| `IJoinPoint` / `JoinPoint` | State of the intercepted call | `IJoinPoint` / `JoinPoint` |
| `IPointCut` / `AspectPointCut` | Decides whether an aspect applies to a method | `IPointCut` / `PointCut` |
| `IAspectExecutor` / `AspectExecutor` | Builds and runs the ordered aspect chain | `IAspectExecutor` / `AspectExecutor` |
| `BaseAspect` | Base class with options and ordering | `AbstractAspect<T>` |
| `OnMethodBoundaryAspect` | `onEntry` / `onSuccess` / `onExit` / `onException` | `OnMethodBoundaryAspect<T>` |
| `OnRetryAspect` | Re-invokes the chain while `canRetry` holds | `OnRetryAspect<T>` |
| `AspectMetadataHelper` | Reads and writes the method metadata | attribute lookup |
| `ResultHelper` | Runs the hooks over sync, Promise and Observable results | — |

## Differences with the .NET version

- Aspects are **stateless**. `SetNext`/`GetNext` are replaced by an `AspectNext`
  continuation, because NestJS providers are singletons and per invocation state
  in fields would leak between calls. Mutable state lives in `IAspectContext`.
- A method is selected by the metadata written by its decorator instead of by
  reflecting over generic attribute types.
- Every hook supports synchronous, `Promise` and `Observable` methods.

## Usage

Aspects are normally consumed through `@nestjslatam/aop.nestjs`. To build one:

```ts
import { IJoinPoint, IAspectContext, OnMethodBoundaryAspect } from '@nestjslatam/aop';

export class AuditAspect extends OnMethodBoundaryAspect {
  readonly token = 'aop:aspect:audit';

  protected onEntry(joinPoint: IJoinPoint, context: IAspectContext): void {
    console.log(`${joinPoint.targetType}.${joinPoint.methodInfo.name}`);
  }
}
```
