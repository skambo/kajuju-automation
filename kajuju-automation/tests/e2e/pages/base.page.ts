import { ConsoleMessage, Page, Request } from '@playwright/test';

/** Records console messages and failed requests from the moment monitoring starts. */
export class BasePage {
  protected readonly consoleMessages: ConsoleMessage[] = [];
  protected readonly failedRequests: Request[] = [];

  constructor(protected readonly page: Page) {}

  /**
   * Starts recording from this point on. Synchronous: it only registers listeners, so there is
   * nothing to await. Call it before the interaction being observed.
   */
  startMonitoring(): void {
    this.page.on('console', (msg) => this.consoleMessages.push(msg));
    this.page.on('requestfailed', (req) => this.failedRequests.push(req));
  }

  consoleErrors(): ConsoleMessage[] {
    return this.consoleMessages.filter((msg) => msg.type() === 'error');
  }

  failedNetworkRequests(): Request[] {
    return this.failedRequests;
  }
}
