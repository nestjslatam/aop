export const AOP_OPTIONS = 'AOP_OPTIONS';
export const AOP_OPTIONS_FACTORY = 'AOP_OPTIONS_FACTORY';
export const AOP_EXECUTOR = 'AOP_EXECUTOR';
export const AOP_POINT_CUT = 'AOP_POINT_CUT';
export const AOP_ASPECTS = 'AOP_ASPECTS';
export const AOP_LOGGER = 'AOP_LOGGER';
export const AOP_SERIALIZER = 'AOP_SERIALIZER';

/** Property the aspect executor is injected into on every decorated class. */
export const AOP_EXECUTOR_PROPERTY = '__aopExecutor';

/** Marks a class that already declares the executor as a property dependency. */
export const AOP_EXECUTOR_INJECTED = 'aop:executor-injected';
