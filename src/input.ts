import { Field, InputType } from '@nestjs/graphql';
import { LogSensitive } from '@nestjslatam/logreflector-lib';

@InputType()
export class InputData {
  @Field()
  firstName: string;

  @Field()
  @LogSensitive()
  lastName: string;
}
