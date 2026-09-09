import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { LogMethod, LogSensitiveParam } from '@nestjslatam/logreflector-lib';

import { InputData } from './input';
import { AppService } from './app.service';

@Resolver()
export class AppResolver {
  constructor(private readonly appService: AppService) {}

  @Query(() => String)
  @LogMethod({ trackingId: 'trackingId', requestId: 'requestId' })
  postWithArgs(
    @Args('firstName')
    @LogSensitiveParam()
    firstName: string,
    @Args('lastName') lastName: string,
  ): string {
    return `Hello World! ${firstName}, ${lastName} with Arguments and sensitive data`;
  }

  @Query(() => String)
  @LogMethod({ trackingId: 'trackingId', requestId: 'requestId' })
  postWithOutArgs(): string {
    return `Hello World! without Arguments`;
  }

  @Query(() => String)
  @LogMethod({
    trackingId: 'trackingId',
    resolveRequestId: (args: any[]) => `order-${args[0]}`,
  })
  async retryDemo(@Args('orderId') orderId: string): Promise<string> {
    void orderId;

    return this.appService.fetchWithRetry();
  }

  @Mutation(() => String)
  @LogMethod({ trackingId: 'trackingId', requestId: 'requestId' })
  postWithMutation(@Args('inputData') inputData: InputData): string {
    const { firstName, lastName } = inputData;
    this.appService.print();
    return `Mutation Sample passing InputType: ${firstName}, ${lastName}`;
  }
}
