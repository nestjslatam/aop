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

    if (!executor) return original.apply(this, args);

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
