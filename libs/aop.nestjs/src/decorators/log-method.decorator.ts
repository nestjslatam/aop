import {
  ILoggerAspectOptions,
  LOGGER_ASPECT_TOKEN,
} from '@nestjslatam/aop.aspects';

import { applyAspect } from './aspect.decorator';

/**
 * Logs entry, result, exit and exception of the decorated method.
 * Equivalent of `[LoggerAspect]` in the .NET library.
 */
export function LogMethod(options: ILoggerAspectOptions = {}): MethodDecorator {
  return applyAspect(LOGGER_ASPECT_TOKEN, options);
}
