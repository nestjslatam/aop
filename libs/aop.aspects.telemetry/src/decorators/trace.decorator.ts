import { applyAspect } from '@nestjslatam/aop.nestjs';

import { TRACE_ASPECT_TOKEN } from '../constants';
import { ITraceAspectOptions } from '../interfaces';

/**
 * Opens an OpenTelemetry span around the decorated method.
 * Combine it with `@LogMethod()` to get the trace ids on every log line.
 */
export function Trace(options: ITraceAspectOptions = {}): MethodDecorator {
  return applyAspect(TRACE_ASPECT_TOKEN, options);
}
