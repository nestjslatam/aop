import 'reflect-metadata';

import { IMetadata } from '@nestjslatam/aop.aspects';

import { getUtcDateTimeFormatted } from './datetime.helper';

export class TemplateHelper {
  static build(
    template: string,
    metadata: IMetadata,
    data: {
      params?: string;
      returnedValue?: string;
      duration?: number;
      error?: string;
    },
  ): string {
    let message = '';

    const { params, returnedValue, duration, error } = data;

    message = template.replace('{datetime}', getUtcDateTimeFormatted());
    message = message.replace('{targettype}', metadata.targetType);
    message = message.replace('{methodinfo}', metadata.methodInfo);

    message = message.replace('{requestid}', metadata.requestId ?? 'None');
    message = message.replace('{trackingid}', metadata.trackingId ?? 'None');
    message = message.replace(
      '{took}',
      duration !== undefined ? duration.toString() : '0',
    );
    message = message.replace('{returnedvalue}', returnedValue ?? 'None');
    message = message.replace('{params}', params ?? 'None');
    message = message.replace(
      '{error}',
      error !== undefined ? JSON.stringify(error) : 'None',
    );

    return message;
  }
}
