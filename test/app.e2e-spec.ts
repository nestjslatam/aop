import { INestApplication, Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AopRegistry } from '@nestjslatam/logreflector-lib';
import * as request from 'supertest';

import { AppModule } from './../src/app.module';
import { AppService } from './../src/app.service';

describe('AppModule (e2e)', () => {
  let app: INestApplication;
  let logged: string[];

  beforeEach(async () => {
    logged = [];

    jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation((message: any) => logged.push(String(message)));
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await app.close();
    AopRegistry.reset();
  });

  it('logs a controller call end to end', async () => {
    await request(app.getHttpServer())
      .post('/appcontrollers/post-controller')
      .expect(201)
      .expect('PRINTING MESSAGE: Your welcome');

    expect(
      logged.some((line) => line.includes('AppController.cs, getController')),
    ).toBe(true);
    expect(logged.some((line) => line.includes('AppService.cs, print'))).toBe(
      true,
    );
    expect(logged.some((line) => line.includes('Start Call'))).toBe(true);
    expect(logged.some((line) => line.includes('End Call'))).toBe(true);
  });

  it('logs a resolver call and retries the flaky provider', async () => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: '{ retryDemo(orderId: "42") }' })
      .expect(200);

    expect(response.body.data.retryDemo).toBe('recovered after 3 attempts');
    expect(app.get(AppService).attemptCount).toBe(3);

    expect(
      logged.some((line) => line.includes('AppResolver.cs, retryDemo')),
    ).toBe(true);
    expect(logged.some((line) => line.includes('RequestId: order-42'))).toBe(
      true,
    );

    const serviceEntries = logged.filter((line) =>
      line.includes('AppService.cs, fetchWithRetry'),
    );

    expect(serviceEntries.some((line) => line.includes('Start Call'))).toBe(
      true,
    );
    expect(
      serviceEntries.filter((line) => line.includes('Start Call')),
    ).toHaveLength(1);
  });

  it('masks the sensitive argument of a resolver', async () => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: '{ postWithArgs(firstName: "ada", lastName: "lovelace") }',
      })
      .expect(200);

    expect(response.body.data.postWithArgs).toContain('ada');

    const entry = logged.find((line) =>
      line.includes('AppResolver.cs, postWithArgs'),
    );

    expect(entry).toBeDefined();
    expect(entry).not.toContain('ada');
    expect(entry).toContain('**********');
  });
});
