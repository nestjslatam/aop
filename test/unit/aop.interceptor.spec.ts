import { Controller, Get, INestApplication } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import {
  AOP_LOGGER,
  AopInterceptor,
  AopModule,
  AopRegistry,
  LogMethod,
} from '@nestjslatam/aop.nestjs';
import * as request from 'supertest';

import { FakeSink } from './aop-test.helper';

@Controller('reports')
class ReportsController {
  /** Handled by the interceptor: the decorator only writes metadata. */
  @Get('interceptor')
  @LogMethod({ useInterceptor: true, logArguments: false })
  viaInterceptor(): string {
    return 'from interceptor';
  }

  /** Handled by the wrapping decorator; the interceptor must skip it. */
  @Get('wrapped')
  @LogMethod({ logArguments: false })
  viaDecorator(): string {
    return 'from decorator';
  }

  @Get('plain')
  plain(): string {
    return 'plain';
  }
}

describe('AopInterceptor', () => {
  let app: INestApplication;
  let sink: FakeSink;

  beforeEach(async () => {
    sink = new FakeSink();

    const moduleRef = await Test.createTestingModule({
      imports: [AopModule.forRoot()],
      controllers: [ReportsController],
      providers: [{ provide: APP_INTERCEPTOR, useClass: AopInterceptor }],
    })
      .overrideProvider(AOP_LOGGER)
      .useValue(sink)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    AopRegistry.reset();
  });

  it('runs the aspects on a handler marked with useInterceptor', async () => {
    await request(app.getHttpServer())
      .get('/reports/interceptor')
      .expect(200)
      .expect('from interceptor');

    expect(sink.phases()).toEqual(['entry', 'call', 'exit']);
    expect(sink.entries[0].context.targetType).toBe('ReportsController');
    expect(sink.entries[0].context.methodInfo).toBe('viaInterceptor');
    expect(sink.entries[1].result?.value).toBe('from interceptor');
  });

  it('takes the request id from the execution context', async () => {
    await request(app.getHttpServer())
      .get('/reports/interceptor')
      .set('x-request-id', 'req-42')
      .expect(200);

    expect(sink.entries[0].context.requestId).toBe('req-42');
  });

  it('does not log twice a handler already wrapped by the decorator', async () => {
    await request(app.getHttpServer())
      .get('/reports/wrapped')
      .expect(200)
      .expect('from decorator');

    expect(sink.phases()).toEqual(['entry', 'call', 'exit']);
  });

  it('ignores a handler without aspects', async () => {
    await request(app.getHttpServer())
      .get('/reports/plain')
      .expect(200)
      .expect('plain');

    expect(sink.entries).toHaveLength(0);
  });
});
