/**
 * Metadata key holding the list of aspects declared on a method.
 * Compatible with the NestJS `Reflector`, so it can be read with
 * `reflector.get(AOP_ASPECTS_METADATA, context.getHandler())`.
 */
export const AOP_ASPECTS_METADATA = 'aop:aspects';

/** Marks a method already wrapped by an aspect decorator. */
export const AOP_WRAPPED_METADATA = 'aop:wrapped';
