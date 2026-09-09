import 'reflect-metadata';

import { LOG_REFLECTOR_SENSITIVE } from '@nestjslatam/aop.aspects';
import { AOP_SENSITIVE_PROPERTIES } from '@nestjslatam/aop.aspects.logger';

/** Masks a parameter in the logged arguments. */
export const LogSensitiveParam = () => {
  return (
    target: object,
    propertyKey: string | symbol,
    parameterIndex?: number,
  ) => {
    const parameters =
      Reflect.getOwnMetadata(LOG_REFLECTOR_SENSITIVE, target, propertyKey) ||
      [];

    Reflect.defineMetadata(
      LOG_REFLECTOR_SENSITIVE,
      [...parameters, parameterIndex],
      target,
      propertyKey,
    );
  };
};

/**
 * Masks a property when the payload is serialized with
 * `SensitiveDataJsonSerializer`. Equivalent of the attribute consumed by
 * `SensitiveDataResolver` in the .NET library.
 */
export const LogSensitive = () => {
  return (target: object, propertyKey: string | symbol) => {
    const owner = target.constructor;

    const properties: string[] =
      Reflect.getOwnMetadata(AOP_SENSITIVE_PROPERTIES, owner) || [];

    Reflect.defineMetadata(
      AOP_SENSITIVE_PROPERTIES,
      [...properties, String(propertyKey)],
      owner,
    );
  };
};
