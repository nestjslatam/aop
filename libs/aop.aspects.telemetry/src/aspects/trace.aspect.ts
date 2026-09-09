import {
  IAspectContext,
  IJoinPoint,
  OnMethodBoundaryAspect,
} from '@nestjslatam/aop';
import {
  context as otelContext,
  Span,
  SpanStatusCode,
  trace,
} from '@opentelemetry/api';

import {
  CODE_FUNCTION_ATTRIBUTE,
  CODE_NAMESPACE_ATTRIBUTE,
  DEFAULT_TRACER_NAME,
  TRACE_ASPECT_TOKEN,
} from '../constants';
import { ITraceAspectOptions, TracerResolver } from '../interfaces';

interface ITraceAspectContext extends IAspectContext<ITraceAspectOptions> {
  state: { span?: Span };
}

const defaultTracerResolver: TracerResolver = (name?: string) =>
  trace.getTracer(name ?? DEFAULT_TRACER_NAME);

/**
 * Opens one span per intercepted call and makes it the active span while the
 * method runs, so anything invoked inside it — including the logging aspect and
 * any auto instrumented client — hangs from the same trace.
 *
 * It has no counterpart in the .NET library; it is the tracing side of the same
 * `OnMethodBoundaryAspect` used by `LoggerAspect`.
 */
export class TraceAspect extends OnMethodBoundaryAspect<
  ITraceAspectOptions,
  ITraceAspectContext
> {
  readonly token = TRACE_ASPECT_TOKEN;

  constructor(
    private readonly resolveTracer: TracerResolver = defaultTracerResolver,
  ) {
    super();
  }

  /** Runs outermost by default so the span covers logging and retries. */
  getOrder(joinPoint: IJoinPoint): number {
    return this.getOptions(joinPoint)?.order ?? 0;
  }

  protected init(joinPoint: IJoinPoint, context: ITraceAspectContext): void {
    const { options } = context;

    context.handleException = true;

    const span = this.resolveTracer(options.tracer).startSpan(
      options.name ?? `${joinPoint.targetType}.${joinPoint.methodInfo.name}`,
      {
        kind: options.kind,
        attributes: {
          [CODE_FUNCTION_ATTRIBUTE]: joinPoint.methodInfo.name,
          [CODE_NAMESPACE_ATTRIBUTE]: joinPoint.targetType,
          ...options.attributes,
          ...options.resolveAttributes?.(joinPoint.args, joinPoint),
        },
      },
    );

    context.state.span = span;

    const spanContext = span.spanContext();

    joinPoint.traceId = spanContext.traceId;
    joinPoint.spanId = spanContext.spanId;
  }

  /** Activates the span for the whole invocation, retries included. */
  protected invoke(
    joinPoint: IJoinPoint,
    context: ITraceAspectContext,
    next: () => any,
  ): any {
    const span = context.state.span;

    if (!span) return super.invoke(joinPoint, context, next);

    return otelContext.with(trace.setSpan(otelContext.active(), span), () =>
      super.invoke(joinPoint, context, next),
    );
  }

  protected onSuccess(
    joinPoint: IJoinPoint,
    context: ITraceAspectContext,
  ): void {
    context.state.span?.setStatus({ code: SpanStatusCode.OK });
  }

  protected onException(
    joinPoint: IJoinPoint,
    context: ITraceAspectContext,
    error: any,
  ): void {
    const span = context.state.span;

    if (span) {
      if (context.options.recordException !== false) {
        span.recordException(error);
      }

      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error?.message ?? String(error),
      });
    }

    throw error;
  }

  protected onExit(joinPoint: IJoinPoint, context: ITraceAspectContext): void {
    context.state.span?.end();
  }
}
