import 'reflect-metadata';

import { SENSITIVE_MASK } from '@nestjslatam/aop.aspects';

import { AOP_SENSITIVE_PROPERTIES } from '../constants';
import { ISerializer } from './serializer.interface';

/**
 * TypeScript port of `SensitiveDataJsonSerializer` plus `SensitiveDataResolver`
 * and `SensitiveDataValueProvider`: the three .NET types collapse into a single
 * `JSON.stringify` replacer, which is the equivalent extension point.
 */
export class SensitiveDataJsonSerializer implements ISerializer {
  constructor(private readonly mask: string = SENSITIVE_MASK) {}

  serialize(value: any): string {
    const mask = this.mask;

    try {
      return JSON.stringify(
        value,
        function replacer(this: any, key: string, current: any) {
          const owner = this?.constructor;

          if (!owner || owner === Object) return current;

          const properties: string[] =
            Reflect.getMetadata(AOP_SENSITIVE_PROPERTIES, owner) ?? [];

          return properties.includes(key) ? mask : current;
        },
      );
    } catch {
      return '[Unserializable]';
    }
  }
}
