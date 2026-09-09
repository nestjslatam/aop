import { AspectMetadataHelper } from '../helpers';
import { IJoinPoint, IPointCut } from '../interfaces';

/**
 * TypeScript port of `BeyondNet.Aop.PointCut`.
 *
 * The .NET version inspects the generic attribute of the aspect type; here the
 * decorator writes the aspect token in the method metadata, which is the
 * idiomatic NestJS mechanism (`SetMetadata` + `Reflector`).
 */
export class AspectPointCut implements IPointCut {
  private readonly cache = new WeakMap<object, Map<string, boolean>>();

  canApply(joinPoint: IJoinPoint, aspectToken: string): boolean {
    const target = joinPoint.targetObject;

    if (!target) return false;

    const key = `${joinPoint.methodInfo.name}#${aspectToken}`;
    const prototype = Object.getPrototypeOf(target) ?? target;

    let entries = this.cache.get(prototype);

    if (!entries) {
      entries = new Map<string, boolean>();
      this.cache.set(prototype, entries);
    }

    const cached = entries.get(key);

    if (cached !== undefined) return cached;

    const canApply =
      AspectMetadataHelper.find(
        target,
        joinPoint.methodInfo.name,
        aspectToken,
      ) !== undefined;

    entries.set(key, canApply);

    return canApply;
  }
}
