import {
  ADVICE_ASPECT_TOKEN,
  IAdviceAspectOptions,
} from '@nestjslatam/aop.aspects';

import { applyAspect } from './aspect.decorator';

/**
 * Runs a custom advice around the decorated method.
 * Equivalent of `[AdviceAspect]` in the .NET library.
 */
export function UseAdvice(options: IAdviceAspectOptions): MethodDecorator {
  return applyAspect(ADVICE_ASPECT_TOKEN, options);
}
