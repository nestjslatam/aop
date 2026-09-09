import { Controller, Post } from '@nestjs/common';
import { LogMethod } from '@nestjslatam/logreflector-lib';

import { AppService } from './app.service';

@Controller('appcontrollers')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('post-controller')
  @LogMethod({ trackingId: 'trackingId', requestId: 'requestId' })
  getController(): string {
    return this.appService.print();
  }
}
