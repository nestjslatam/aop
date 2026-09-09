import {
  IRetryAspectOptions,
  RETRY_ASPECT_TOKEN,
} from '@nestjslatam/aop.aspects';

import { applyAspect } from './aspect.decorator';

/**
 * Retries the decorated method when it fails.
 * Equivalent of `[RetryAspect]` in the .NET library.
 */
export function Retry(options: IRetryAspectOptions = {}): MethodDecorator {
  return applyAspect(RETRY_ASPECT_TOKEN, options);
}
