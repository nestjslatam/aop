import 'reflect-metadata';

import { AOP_ASPECTS_METADATA, AOP_WRAPPED_METADATA } from '../constants';
import { IAspectOptions } from '../interfaces';

export interface IAspectMetadata<
  TOptions extends IAspectOptions = IAspectOptions,
> {
  token: string;
  options: TOptions;
}

/**
 * Reads and writes the aspect metadata attached to a method.
 * Replaces the .NET attribute lookup (`AbstractAspect.GetAttribute`).
 */
export class AspectMetadataHelper {
  static add(
    target: any,
    propertyKey: string | symbol,
    metadata: IAspectMetadata<any>,
  ): void {
    const declared: IAspectMetadata[] =
      Reflect.getOwnMetadata(AOP_ASPECTS_METADATA, target, propertyKey) ?? [];

    Reflect.defineMetadata(
      AOP_ASPECTS_METADATA,
      [...declared, metadata],
      target,
      propertyKey,
    );
  }

  static get(target: any, propertyKey: string | symbol): IAspectMetadata[] {
    if (!target) return [];

    return Reflect.getMetadata(AOP_ASPECTS_METADATA, target, propertyKey) ?? [];
  }

  static find<TOptions extends IAspectOptions = IAspectOptions>(
    target: any,
    propertyKey: string | symbol,
    token: string,
  ): IAspectMetadata<TOptions> | undefined {
    return AspectMetadataHelper.get(target, propertyKey).find(
      (metadata) => metadata.token === token,
    ) as IAspectMetadata<TOptions> | undefined;
  }

  static has(target: any, propertyKey: string | symbol): boolean {
    return AspectMetadataHelper.get(target, propertyKey).length > 0;
  }

  static getParameterTypes(
    target: any,
    propertyKey: string | symbol,
  ): string[] {
    const types: any[] =
      Reflect.getMetadata('design:paramtypes', target, propertyKey) ?? [];

    return types.map((type) => type?.name ?? 'Unknown');
  }

  static getReturnType(
    target: any,
    propertyKey: string | symbol,
  ): string | undefined {
    const type = Reflect.getMetadata('design:returntype', target, propertyKey);

    return type?.name;
  }

  static markWrapped(method: any): void {
    Reflect.defineMetadata(AOP_WRAPPED_METADATA, true, method);
  }

  static isWrapped(method: any): boolean {
    return (
      !!method && Reflect.getOwnMetadata(AOP_WRAPPED_METADATA, method) === true
    );
  }

  /** Copies metadata written by other decorators onto the wrapping function. */
  static copyMetadata(source: any, destination: any): void {
    if (!source || !destination) return;

    for (const key of Reflect.getOwnMetadataKeys(source)) {
      Reflect.defineMetadata(
        key,
        Reflect.getOwnMetadata(key, source),
        destination,
      );
    }
  }
}
