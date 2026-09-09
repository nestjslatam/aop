import { IJoinPoint } from './join-point.interface';

export interface IPointCut {
  canApply(joinPoint: IJoinPoint, aspectToken: string): boolean;
}
