import {
  ISerializer,
  JsonSerializer,
  SensitiveDataJsonSerializer,
} from '@nestjslatam/aop.aspects.logger';

import { IAopOptions } from '../interfaces';

/** Builds the serializer declared in the options. */
export class AopFactory {
  static createSerializer(options?: IAopOptions): ISerializer {
    return options?.configuration?.serializer === 'sensitive'
      ? new SensitiveDataJsonSerializer()
      : new JsonSerializer();
  }
}
