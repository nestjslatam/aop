import { Logger } from '@nestjs/common';
import { ISerializer, JsonSerializer } from '@nestjslatam/aop.aspects.logger';

import { ILogReflector, IOptions } from '../interfaces';
import { LogReflectorDefault } from './reflector-default.service';

export class ReflectorFactory {
  private static readonly logger = new Logger(ReflectorFactory.name);

  constructor(private readonly options: IOptions) {}

  getLogger(): ILogReflector {
    return new LogReflectorDefault(this.getSerializer(), this.options);
  }

  private getSerializer(): ISerializer {
    const serializer = this.options?.configuration?.serializer;

    if (serializer === 'xml') {
      ReflectorFactory.logger.warn(
        'The "xml" serializer has no Node equivalent; falling back to JSON.',
      );
    }

    return new JsonSerializer();
  }
}
