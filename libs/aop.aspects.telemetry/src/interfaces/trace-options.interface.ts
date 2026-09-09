import { Attributes, SpanKind, Tracer } from '@opentelemetry/api';
import { IAspectOptions, IJoinPoint } from '@nestjslatam/aop';

export interface ITraceAspectOptions extends IAspectOptions {
  /** Span name. Defaults to `TargetType.methodName`. */
  name?: string;
  kind?: SpanKind;
  /** Tracer to request from the global provider. */
  tracer?: string;
  attributes?: Attributes;
  /** Attributes computed from the invocation arguments. */
  resolveAttributes?: (args: any[], joinPoint: IJoinPoint) => Attributes;
  /** Records the exception on the span. Defaults to `true`. */
  recordException?: boolean;
}

export type TracerResolver = (name?: string) => Tracer;
