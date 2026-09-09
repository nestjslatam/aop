import { Injectable } from '@nestjs/common';
import { LogMethod, Retry } from '@nestjslatam/logreflector-lib';

@Injectable()
export class AppService {
  private attempts = 0;

  @LogMethod()
  print(): string {
    return 'PRINTING MESSAGE: Your welcome';
  }

  /**
   * The logger aspect wraps the retry aspect (`order` 1 before 2), so the call
   * is logged once even though the method runs several times.
   */
  @LogMethod({ order: 1, trackingId: 'retry-demo' })
  @Retry({ order: 2, maxAttempts: 2, delayMs: 5, backoff: 'exponential' })
  async fetchWithRetry(): Promise<string> {
    this.attempts += 1;

    if (this.attempts < 3) {
      throw new Error(`transient failure #${this.attempts}`);
    }

    return `recovered after ${this.attempts} attempts`;
  }

  get attemptCount(): number {
    return this.attempts;
  }

  reset(): void {
    this.attempts = 0;
  }
}
