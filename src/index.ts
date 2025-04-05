import { HTTPRequest, Page } from 'puppeteer';

interface ResolvableRequest extends HTTPRequest {
  pendingXhrResolver?: () => void;
}

export class PendingXHR {
  page: Page;

  resourceType: string;

  pendingXhrs: Set<HTTPRequest>;

  finishedWithSuccessXhrs: Set<HTTPRequest>;

  finishedWithErrorsXhrs: Set<HTTPRequest>;

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
            request.pendingXhrResolver = resolve;
          }),
        );
      }
    };

    this.requestFailedListener = (request: ResolvableRequest) => {
      if (request.resourceType() === this.resourceType) {
        this.pendingXhrs.delete(request);
        this.finishedWithErrorsXhrs.add(request);
        if (request.pendingXhrResolver) {
          request.pendingXhrResolver();
        }
        delete request.pendingXhrResolver;
      }
    };

    this.requestFinishedListener = (request: ResolvableRequest) => {
      if (request.resourceType() === this.resourceType) {
        this.pendingXhrs.delete(request);
        this.finishedWithSuccessXhrs.add(request);
        if (request.pendingXhrResolver) {
          request.pendingXhrResolver();
        }
        delete request.pendingXhrResolver;
      }
    };

    page.on('request', this.requestListener);
    page.on('requestfailed', this.requestFailedListener);
    page.on('requestfinished', this.requestFinishedListener);
  }

  removePageListeners() {
    this.page.off('request', this.requestListener);
    this.page.off('requestfailed', this.requestFailedListener);
    this.page.off('requestfinished', this.requestFinishedListener);
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
