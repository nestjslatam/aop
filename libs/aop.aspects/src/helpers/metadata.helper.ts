import 'reflect-metadata';

import { IJoinPoint } from '@nestjslatam/aop';

import { LOG_REFLECTOR_SENSITIVE, SENSITIVE_MASK } from '../constants';
import { ILogContext, IMetadata } from '../interfaces';
import { Parameter } from '../models';

export class MetadataHelper {
  static build(
    target: any,
    propertyKey?: symbol | string,
    descriptor?: any,
    trackingId?: string,
    requestId?: string,
  ): IMetadata {
    return {
      targetType: target?.constructor?.name,
      methodInfo: propertyKey?.toString(),
      targetObject: target,
      descriptor,
      trackingId,
      requestId,
    } as IMetadata;
  }

  static fromJoinPoint(joinPoint: IJoinPoint, duration?: number): ILogContext {
    return {
      targetType: joinPoint.targetType,
      methodInfo: joinPoint.methodInfo.name,
      targetObject: joinPoint.targetObject,
      descriptor: joinPoint.methodInfo.descriptor,
      trackingId: joinPoint.trackingId,
      requestId: joinPoint.requestId,
      traceId: joinPoint.traceId,
      spanId: joinPoint.spanId,
      duration,
    };
  }

  static getParameters(metadata: IMetadata, args: any[]): Parameter[] {
    const parameters: Parameter[] = [];

    const typesReflected: any[] =
      Reflect.getMetadata(
        'design:paramtypes',
        metadata.targetObject,
        metadata.methodInfo,
      ) ?? [];

    const sensitives: number[] =
      Reflect.getMetadata(
        LOG_REFLECTOR_SENSITIVE,
        metadata.targetObject,
        metadata.methodInfo,
      ) ?? [];

    const total = Math.max(typesReflected.length, args?.length ?? 0);

    for (let index = 0; index < total; index++) {
      const value = sensitives.includes(index) ? SENSITIVE_MASK : args?.[index];

      parameters.push(
        new Parameter(index, typesReflected[index]?.name ?? 'Unknown', value),
      );
    }

    return parameters;
  }

  static getDuration = (startedAt: Date): number =>
    new Date().getTime() - startedAt.getTime();
}
