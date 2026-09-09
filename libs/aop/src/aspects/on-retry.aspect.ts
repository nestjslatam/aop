import { delayFor, isAsync, ResultHelper } from '../helpers';
import {
  AspectNext,
  IAspectContext,
  IAspectOptions,
  IJoinPoint,
} from '../interfaces';
import { OnMethodBoundaryAspect } from './on-method-boundary.aspect';

/**
 * TypeScript port of `BeyondNet.Aop.OnRetryAspect<T>`.
 *
 * Only the invocation is retried: `onEntry` runs once and `onExit` runs once,
 * unlike the .NET version which skipped `OnExit` when the retries were
 * exhausted. Backoff delays require an async or Observable method; on a purely
 * synchronous method the retry is immediate because the call cannot be
 * suspended without blocking the event loop.
 */
export abstract class OnRetryAspect<
  TOptions extends IAspectOptions = IAspectOptions,
  TContext extends IAspectContext<TOptions> = IAspectContext<TOptions>,
> extends OnMethodBoundaryAspect<TOptions, TContext> {
  protected invoke(
    joinPoint: IJoinPoint,
    context: TContext,
    next: AspectNext,
  ): any {
    return this.attempt(joinPoint, context, next, 0);
  }

  private attempt(
    joinPoint: IJoinPoint,
    context: TContext,
    next: AspectNext,
    attempt: number,
  ): any {
    let result: any;

    try {
      result = next();
    } catch (error) {
      if (!this.canRetry(joinPoint, context, error, attempt)) throw error;

      return this.attempt(joinPoint, context, next, attempt + 1);
    }

    if (!isAsync(result)) return result;

    return ResultHelper.handle(result, {
      onError: (error) => {
        if (!this.canRetry(joinPoint, context, error, attempt)) throw error;

        const delay = this.getDelay(context, attempt);

        return delay > 0
          ? delayFor(delay).then(() =>
              this.attempt(joinPoint, context, next, attempt + 1),
            )
          : this.attempt(joinPoint, context, next, attempt + 1);
      },
    });
  }

  protected canRetry(
    joinPoint: IJoinPoint,
    context: TContext,
    error: any,
    attempt: number,
  ): boolean {
    void joinPoint;
    void context;
    void error;
    void attempt;

    return false;
  }

  protected getDelay(context: TContext, attempt: number): number {
    void context;
    void attempt;

    return 0;
  }
}
