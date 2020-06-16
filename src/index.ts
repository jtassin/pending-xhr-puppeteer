import { Request, Page } from 'puppeteer';

interface ResolvableRequest extends Request {
  resolver: () => void;
}

export class PendingXHR {
  page: Page;

  resourceType: string;

  pendingXhrs: Set<Request>;

  finishedWithSuccessXhrs: Set<Request>;

  finishedWithErrorsXhrs: Set<Request>;

  promisees: Promise<void>[];

  requestListener: (request: ResolvableRequest) => void;

  requestFailedListener: (request: ResolvableRequest) => void;

  requestFinishedListener: (request: ResolvableRequest) => void;

  constructor(page: Page) {
    this.promisees = [];
    this.page = page;
    this.resourceType = 'xhr';
    this.pendingXhrs = new Set();
    this.finishedWithSuccessXhrs = new Set();
    this.finishedWithErrorsXhrs = new Set();

    this.requestListener = (request: ResolvableRequest) => {
      if (request.resourceType() === this.resourceType) {
        this.pendingXhrs.add(request);
        this.promisees.push(
          new Promise(resolve => {
            request.resolver = resolve;
          }),
        );
      }
    };

    this.requestFailedListener = (request: ResolvableRequest) => {
      if (request.resourceType() === this.resourceType) {
        this.pendingXhrs.delete(request);
        this.finishedWithErrorsXhrs.add(request);
        request.resolver();
        delete request.resolver;
      }
    };

    this.requestFinishedListener = (request: ResolvableRequest) => {
      if (request.resourceType() === this.resourceType) {
        this.pendingXhrs.delete(request);
        this.finishedWithSuccessXhrs.add(request);
        request.resolver();
        delete request.resolver;
      }
    };

    page.on('request', this.requestListener);
    page.on('requestfailed', this.requestFailedListener);
    page.on('requestfinished', this.requestFinishedListener);
  }

  removePageListeners() {
    this.page.removeListener('request', this.requestListener);
    this.page.removeListener('requestfailed', this.requestFailedListener);
    this.page.removeListener('requestfinished', this.requestFinishedListener);
  }

  async waitForAllXhrFinished() {
    if (this.pendingXhrCount() === 0) {
      return;
    }
    await Promise.all(this.promisees);
  }

  async waitOnceForAllXhrFinished() {
    await this.waitForAllXhrFinished();

    this.removePageListeners();
  }

  pendingXhrCount() {
    return this.pendingXhrs.size;
  }
}
