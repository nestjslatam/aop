import { IAspectContext, IJoinPoint, OnRetryAspect } from '@nestjslatam/aop';

import { RETRY_ASPECT_TOKEN } from '../constants';
import { IRetryAspectOptions } from '../interfaces';

type IRetryAspectContext = IAspectContext<IRetryAspectOptions>;

/**
 * TypeScript port of `BeyondNet.Aop.Aspects.RetryAspect`.
 * The .NET version counts attempts in a field of the aspect, which leaks state
 * between calls; the counter travels with the invocation here.
 */
export class RetryAspect extends OnRetryAspect<
  IRetryAspectOptions,
  IRetryAspectContext
> {
  readonly token = RETRY_ASPECT_TOKEN;

  protected init(joinPoint: IJoinPoint, context: IRetryAspectContext): void {
    void joinPoint;

    context.handleException = context.options.handleException === true;
  }

  protected canRetry(
    joinPoint: IJoinPoint,
    context: IRetryAspectContext,
    error: any,
    attempt: number,
  ): boolean {
    void joinPoint;

    const { maxAttempts = 3, errorTypes } = context.options;

    if (attempt >= maxAttempts) return false;

    if (errorTypes?.length) {
      return errorTypes.some((errorType) => error instanceof errorType);
    }

    return true;
  }

  protected getDelay(context: IRetryAspectContext, attempt: number): number {
    const { delayMs = 0, backoff = 'fixed' } = context.options;

    return backoff === 'exponential' ? delayMs * Math.pow(2, attempt) : delayMs;
  }
}
