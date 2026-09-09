import { ResultHelper } from '../helpers';
import {
  AspectNext,
  IAspectContext,
  IAspectOptions,
  IJoinPoint,
} from '../interfaces';
import { BaseAspect } from './base.aspect';

/**
 * TypeScript port of `BeyondNet.Aop.OnMethodBoundaryAspect<T>`.
 *
 * Guarantees that `onExit` runs exactly once for sync, async and Observable
 * methods, on both the success and the failure path.
 */
export abstract class OnMethodBoundaryAspect<
  TOptions extends IAspectOptions = IAspectOptions,
  TContext extends IAspectContext<TOptions> = IAspectContext<TOptions>,
> extends BaseAspect<TOptions, TContext> {
  apply(joinPoint: IJoinPoint, next: AspectNext): any {
    const context = this.createContext(joinPoint);

    this.init(joinPoint, context);
    this.onEntry(joinPoint, context);

    let result: any;

    try {
      result = this.shouldContinue(joinPoint, context)
        ? this.invoke(joinPoint, context, next)
        : joinPoint.returnValue;
    } catch (error) {
      return this.fail(joinPoint, context, error);
    }

    return ResultHelper.handle(result, {
      onSuccess: (value) => {
        joinPoint.returnValue = value;
        this.onSuccess(joinPoint, context);
      },
      onError: (error) => this.failWithoutExit(joinPoint, context, error),
      onFinally: () => this.onExit(joinPoint, context),
    });
  }

  /** Extension point used by `OnRetryAspect` to re-invoke the chain. */
  protected invoke(
    joinPoint: IJoinPoint,
    context: TContext,
    next: AspectNext,
  ): any {
    void joinPoint;
    void context;

    return next();
  }

  private fail(joinPoint: IJoinPoint, context: TContext, error: any): any {
    try {
      return this.failWithoutExit(joinPoint, context, error);
    } finally {
      this.onExit(joinPoint, context);
    }
  }

  private failWithoutExit(
    joinPoint: IJoinPoint,
    context: TContext,
    error: any,
  ): any {
    if (context.handleException) {
      this.onException(joinPoint, context, error);

      return joinPoint.returnValue;
    }

    throw error;
  }

  protected shouldContinue(joinPoint: IJoinPoint, context: TContext): boolean {
    void joinPoint;
    void context;

    return true;
  }

  protected onEntry(joinPoint: IJoinPoint, context: TContext): void {
    void joinPoint;
    void context;
  }

  protected onSuccess(joinPoint: IJoinPoint, context: TContext): void {
    void joinPoint;
    void context;
  }

  protected onExit(joinPoint: IJoinPoint, context: TContext): void {
    void joinPoint;
    void context;
  }

  protected onException(
    joinPoint: IJoinPoint,
    context: TContext,
    error: any,
  ): void {
    void joinPoint;
    void context;
    void error;
  }
}
