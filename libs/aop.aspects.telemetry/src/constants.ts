/** Metadata token of the tracing aspect. */
export const TRACE_ASPECT_TOKEN = 'aop:aspect:trace';

/** Tracer requested when the decorator does not name one. */
export const DEFAULT_TRACER_NAME = '@nestjslatam/aop';

/**
 * Attribute names follow the OpenTelemetry semantic conventions for code.
 * @see https://opentelemetry.io/docs/specs/semconv/attributes-registry/code/
 */
export const CODE_FUNCTION_ATTRIBUTE = 'code.function';
export const CODE_NAMESPACE_ATTRIBUTE = 'code.namespace';
