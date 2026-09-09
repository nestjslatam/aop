import { ModuleMetadata, Provider, Type } from '@nestjs/common/interfaces';

import { IAopAspectsBuilder } from './aspects-builder.interface';

export interface IAopOptions {
  behavior?: {
    useProduction?: boolean;
  };
  configuration?: {
    /** `sensitive` masks the properties flagged with `@LogSensitive()`. */
    serializer?: 'json' | 'sensitive';
    output?: 'console';
  };
  /** Registers extra aspects, advices and logging sinks. */
  configure?: (builder: IAopAspectsBuilder) => void;
}

export interface IAopOptionsFactory {
  createOptions(): Promise<IAopOptions> | IAopOptions;
}

export interface IAopOptionsAsync extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<IAopOptionsFactory>;
  useClass?: Type<IAopOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<IAopOptions> | IAopOptions;
  inject?: any[];
  extraProviders?: Provider[];
  configure?: (builder: IAopAspectsBuilder) => void;
}
