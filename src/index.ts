import { Request, Page } from 'puppeteer';

interface ResolvableRequest extends Request {
  resolver: () => void;
}

/**
 * 魔改来源: https://github.com/jtassin/pending-xhr-puppeteer
 */
// noinspection SpellCheckingInspection
export default class PendingXHR {
  page: Page;
  resourceType: string;
  pendingXhrs: Set<Request>;
  finishedWithSuccessXhrs: Set<Request>;
  finishedWithErrorsXhrs: Set<Request>;
  promisees: Array<Promise<void>>

  constructor(page: Page) {
    this.promisees = [];
    this.page = page;
    this.resourceType = 'xhr';
    this.pendingXhrs = new Set();
    this.finishedWithSuccessXhrs = new Set();
    this.finishedWithErrorsXhrs = new Set();

    this.addEventListeners();
  }

  private addEventListeners() {
    this.page.on('request', this.requestListener);
    this.page.on('requestfailed', this.requestFailedListener);
    this.page.on('requestfinished', this.requestFinishedListener);
  }

  /**
   * expose this allow developer manually control it
   */
  public removeEventListeners() {
    this.page.removeListener('request', this.requestListener);
    this.page.removeListener('requestfailed', this.requestFailedListener);
    this.page.removeListener('requestfinished', this.requestFinishedListener);
  }

  private requestListener = (request: ResolvableRequest) => {
    if (request.resourceType() === this.resourceType) {
      this.pendingXhrs.add(request);
      this.promisees.push(
        new Promise(resolve => {
          request.resolver = resolve;
        }),
      );
    }
  }

  private requestFailedListener = (request: ResolvableRequest) => {
    if (request.resourceType() === this.resourceType) {
      this.pendingXhrs.delete(request);
      this.finishedWithErrorsXhrs.add(request);
      if (request.resolver) {
        request.resolver();
        delete request.resolver;
      }
    }
  };

  private requestFinishedListener = (request: ResolvableRequest) => {
    if (request.resourceType() === this.resourceType) {
      this.pendingXhrs.delete(request);
      this.finishedWithSuccessXhrs.add(request);
      if (request.resolver) {
        request.resolver();
        delete request.resolver;
      }
    }
  };

  public async waitForAllXhrFinished() {
    if (this.pendingXhrCount() === 0) {
      return;
    }
    await Promise.all(this.promisees);
  }

  public async waitOnceForAllXhrFinished() {
    /**
     * try catch ensure anyhow remove event listeners
     */
    try {
      await this.waitForAllXhrFinished();
    } finally {
      this.removeEventListeners();
    }
  }

  public pendingXhrCount() {
    return this.pendingXhrs.size;
  }
}
