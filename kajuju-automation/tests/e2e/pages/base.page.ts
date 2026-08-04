import { ConsoleMessage, Page, Request } from '@playwright/test';

export class BasePage {
  protected readonly consoleMessages: ConsoleMessage[] = [];
  protected readonly failedRequests: Request[] = [];

  constructor(protected readonly page: Page) {}

  async goto(url: string) {
    await this.page.goto(url);
  }

  async reload() {
    await this.page.reload();
  }

  /** Starts recording console messages and failed network requests from this point on. */
  startMonitoring() {
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
