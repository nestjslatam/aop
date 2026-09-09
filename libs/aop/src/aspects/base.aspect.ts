import { AspectMetadataHelper } from '../helpers';
import {
  AspectNext,
  IAspect,
  IAspectContext,
  IAspectOptions,
  IJoinPoint,
} from '../interfaces';

/**
 * TypeScript port of `BeyondNet.Aop.AbstractAspect<T>`.
 *
 * The .NET version keeps per invocation state in fields because aspects are
 * resolved as transient. NestJS providers are singletons, so state lives in the
 * `IAspectContext` created for every call instead.
 */
export abstract class BaseAspect<
  TOptions extends IAspectOptions = IAspectOptions,
  TContext extends IAspectContext<TOptions> = IAspectContext<TOptions>,
> implements IAspect
{
  abstract readonly token: string;

  abstract apply(joinPoint: IJoinPoint, next: AspectNext): any;

  getOrder(joinPoint: IJoinPoint): number {
    return this.getOptions(joinPoint)?.order ?? Number.MAX_SAFE_INTEGER;
  }

  protected getOptions(joinPoint: IJoinPoint): TOptions | undefined {
    return AspectMetadataHelper.find<TOptions>(
      joinPoint.targetObject,
      joinPoint.methodInfo.name,
      this.token,
    )?.options;
  }

  protected createContext(joinPoint: IJoinPoint): TContext {
    return {
      options: this.getOptions(joinPoint) ?? ({} as TOptions),
      handleException: false,
      state: {},
    } as TContext;
  }

  /** Hook equivalent to `AbstractAspect.Init`. */
  protected init(joinPoint: IJoinPoint, context: TContext): void {
    void joinPoint;
    void context;
  }
}
