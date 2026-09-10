# @nestjslatam/aop

Núcleo de AOP para NestJS. Port de la librería .NET `BeyondNet.Aop`.

Aporta las primitivas de intercepción y nada más: no depende de
`@nestjs/common`, así que se puede reutilizar fuera de NestJS.

## Contenido

| Tipo | Para qué | Origen .NET |
| --- | --- | --- |
| `IJoinPoint` / `JoinPoint` | Estado de la llamada interceptada | `IJoinPoint` / `JoinPoint` |
| `IPointCut` / `AspectPointCut` | Decide si un aspecto aplica a un método | `IPointCut` / `PointCut` |
| `IAspectExecutor` / `AspectExecutor` | Construye y ejecuta la cadena ordenada de aspectos | `IAspectExecutor` / `AspectExecutor` |
| `BaseAspect` | Clase base con opciones y ordenación | `AbstractAspect<T>` |
| `OnMethodBoundaryAspect` | `onEntry` / `onSuccess` / `onExit` / `onException` | `OnMethodBoundaryAspect<T>` |
| `OnRetryAspect` | Reinvoca la cadena mientras `canRetry` se cumpla | `OnRetryAspect<T>` |
| `AspectMetadataHelper` | Lee y escribe la metadata del método | búsqueda de attributes |
| `ResultHelper` | Ejecuta los hooks sobre resultados síncronos, `Promise` y `Observable` | — |

## Diferencias con la versión .NET

- Los aspectos son **sin estado**. `SetNext`/`GetNext` se sustituyen por una
  continuación `AspectNext`, porque los providers de NestJS son singletons y el
  estado por invocación en campos se filtraría entre llamadas. El estado mutable
  vive en `IAspectContext`.
- Un método se selecciona por la metadata que escribe su decorador, en vez de
  por reflexión sobre tipos genéricos de attribute.
- Todos los hooks soportan métodos síncronos, `Promise` y `Observable`.

## Uso

Normalmente los aspectos se consumen a través de `@nestjslatam/aop.nestjs`.
Para construir uno:

```ts
import { IJoinPoint, IAspectContext, OnMethodBoundaryAspect } from '@nestjslatam/aop';

export class AuditAspect extends OnMethodBoundaryAspect {
  readonly token = 'aop:aspect:audit';

  protected onEntry(joinPoint: IJoinPoint, context: IAspectContext): void {
    console.log(`${joinPoint.targetType}.${joinPoint.methodInfo.name}`);
  }
}
```

## Documentación

[Manual de uso](https://github.com/nestjslatam/aop/blob/main/docs/es/usage.md) ·
[Guía How-To](https://github.com/nestjslatam/aop/blob/main/docs/es/how-to.md) ·
[Arquitectura](https://github.com/nestjslatam/aop/blob/main/docs/es/architecture.md)

## Licencia

MIT
