import { APP_INTERCEPTOR } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  AopInterceptor,
  LogReflectorModule,
} from '@nestjslatam/logreflector-lib';

import { AppResolver } from './app.resolver';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    LogReflectorModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        behavior: {
          useProduction: configService.get('NODE_ENV') === 'production',
        },
        configuration: {
          serializer: 'json' as const,
          extension: 'default' as const,
          output: 'console' as const,
          pathFile: 'logs',
        },
      }),
      inject: [ConfigService],
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      playground: false,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
    }),
  ],

  controllers: [AppController],
  providers: [
    AppService,
    AppResolver,
    { provide: APP_INTERCEPTOR, useClass: AopInterceptor },
  ],
})
export class AppModule {}
