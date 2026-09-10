import 'reflect-metadata';

import { Inject } from '@nestjs/common';
import {
  AspectMetadataHelper,
  IAspectExecutor,
  IAspectOptions,
  JoinPoint,
} from '@nestjslatam/aop';

import {
  AOP_EXECUTOR,
  AOP_EXECUTOR_INJECTED,
  AOP_EXECUTOR_PROPERTY,
} from '../constants';
import { AopRegistry } from '../registry';

const injectExecutor = (target: any): void => {
  const owner = target?.constructor;

  if (!owner || Reflect.getOwnMetadata(AOP_EXECUTOR_INJECTED, owner)) return;

  Inject(AOP_EXECUTOR)(target, AOP_EXECUTOR_PROPERTY);

  Reflect.defineMetadata(AOP_EXECUTOR_INJECTED, true, owner);
};

let yaAviso = false;

/**
 * Says out loud that the aspects are not armed.
 *
 * Without an executor the wrapper calls the original method and returns: the
 * retry never retries, the span never opens and the log never comes out, and
 * nothing points at it. One line per process is enough to turn an afternoon of
 * hunting into a fixed import.
 *
 * It is a warning and not an exception on purpose: decorating a plain class and
 * running it without the container is legitimate, and the library documents
 * that fallback.
 */
const avisarUnaVez = (target: any, propertyKey: string | symbol): void => {
  if (yaAviso) return;

  yaAviso = true;

  // eslint-disable-next-line no-console
  console.warn(
    `[aop] No aspect executor is armed: ${
      target?.constructor?.name ?? 'Unknown'
    }.${String(propertyKey)} ` +
      'and every other decorated method are running with their aspects disabled. ' +
      'Import AopModule.forRoot() in the application, or call AopRegistry.set() outside NestJS.',
  );
};

const wrap = (
  target: any,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor,
): void => {
  const original = descriptor.value;

  const parameterTypes = AspectMetadataHelper.getParameterTypes(
    target,
    propertyKey,
  );
  const returnType = AspectMetadataHelper.getReturnType(target, propertyKey);

  const wrapped = function (this: any, ...args: any[]): any {
    const executor: IAspectExecutor | undefined =
      this?.[AOP_EXECUTOR_PROPERTY] ?? AopRegistry.get();

    if (!executor) {
      avisarUnaVez(target, propertyKey);

      return original.apply(this, args);
    }

    const joinPoint = new JoinPoint({
      args,
      methodInfo: {
        name: String(propertyKey),
        parameterTypes,
        returnType,
        descriptor,
      },
      targetObject: this,
      targetType: this?.constructor?.name ?? 'Unknown',
      invoke: (finalArgs: any[]) => original.apply(this, finalArgs),
    });

    return executor.execute(joinPoint);
  };

  Object.defineProperty(wrapped, 'name', { value: original.name });

  AspectMetadataHelper.copyMetadata(original, wrapped);
  AspectMetadataHelper.markWrapped(wrapped);

  descriptor.value = wrapped;
};

/**
 * Declares an aspect on a method. The first decorator wraps the method; the
 * rest only add their metadata, so several aspects share a single interception
 * and run as one ordered chain.
 */
export function applyAspect<TOptions extends IAspectOptions>(
  token: string,
  options: TOptions,
): MethodDecorator {
  return (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    AspectMetadataHelper.add(target, propertyKey, { token, options });

    if (options.useInterceptor) return descriptor;

    injectExecutor(target);

    if (!AspectMetadataHelper.isWrapped(descriptor.value)) {
      wrap(target, propertyKey, descriptor);
    }

    return descriptor;
  };
}
