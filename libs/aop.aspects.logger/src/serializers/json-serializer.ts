import { ISerializer } from './serializer.interface';

/**
 * TypeScript port of `BeyondNet.Aop.Aspects.Logger.JsonSerializer`.
 * Never throws: a value that cannot be serialized must not break the
 * intercepted method.
 */
export class JsonSerializer implements ISerializer {
  serialize(value: any): string {
    try {
      return JSON.stringify(value);
    } catch {
      return '[Unserializable]';
    }
  }
}
