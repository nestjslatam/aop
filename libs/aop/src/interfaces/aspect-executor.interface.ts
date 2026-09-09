import { IJoinPoint } from './join-point.interface';

export interface IAspectExecutor {
  execute(joinPoint: IJoinPoint): any;
}
