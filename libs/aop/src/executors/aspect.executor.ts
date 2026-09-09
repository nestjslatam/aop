import {
  AspectNext,
  IAspect,
  IAspectExecutor,
  IJoinPoint,
  IPointCut,
} from '../interfaces';

/**
 * TypeScript port of `BeyondNet.Aop.AspectExecutor`.
 *
 * The .NET version links aspects with `SetNext`, which is not safe when the
 * aspect instances are container singletons. The chain is built here as a
 * continuation, the same way NestJS composes interceptors.
 */
export class AspectExecutor implements IAspectExecutor {
  constructor(
    private readonly aspects: IAspect[],
    private readonly pointCut: IPointCut,
  ) {}

  execute(joinPoint: IJoinPoint): any {
    const applicable = this.aspects
      .filter((aspect) => this.pointCut.canApply(joinPoint, aspect.token))
      .sort(
        (left, right) => left.getOrder(joinPoint) - right.getOrder(joinPoint),
      );

    if (applicable.length === 0) return joinPoint.proceed();

    const chain = applicable.reduceRight<AspectNext>(
      (next, aspect) => () => aspect.apply(joinPoint, next),
      () => joinPoint.proceed(),
    );

    return chain();
  }
}
