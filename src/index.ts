import { Page, HTTPRequest, ResourceType } from 'puppeteer';

interface ResolvableRequest extends HTTPRequest {
  pendingResolver?: () => void;
}

export class PendingRequests {
  private readonly page: Page;

  private readonly resourceTypes: ResourceType[] | 'any';

  private readonly pendingRequests: Set<ResolvableRequest>;

  private readonly finishedRequestsWithSuccess: Set<ResolvableRequest>;

  private readonly finishedRequestsWithError: Set<ResolvableRequest>;

  private readonly promises: Promise<void>[];

  private readonly requestListener: (request: ResolvableRequest) => void;

  private readonly requestFailedListener: (request: ResolvableRequest) => void;

  private readonly requestFinishedListener: (
    request: ResolvableRequest,
  ) => void;

  constructor(page: Page, resourceTypes: ResourceType[] | 'any' = ['xhr']) {
    this.page = page;
    this.resourceTypes = resourceTypes;

    this.promises = [];
    this.pendingRequests = new Set();
    this.finishedRequestsWithSuccess = new Set();
    this.finishedRequestsWithError = new Set();

    this.requestListener = (request: ResolvableRequest) => {
      if (this.handleResourceType(request.resourceType())) {
        this.pendingRequests.add(request);
        this.promises.push(
          new Promise(resolve => {
            request.pendingResolver = resolve;
          }),
        );
      }
    };

    this.requestFailedListener = (request: ResolvableRequest) => {
      if (this.handleResourceType(request.resourceType())) {
        this.pendingRequests.delete(request);
        this.finishedRequestsWithError.add(request);
        if (request.pendingResolver) {
          request.pendingResolver();
        }
        delete request.pendingResolver;
      }
    };

    this.requestFinishedListener = (request: ResolvableRequest) => {
      if (this.handleResourceType(request.resourceType())) {
        this.pendingRequests.delete(request);
        this.finishedRequestsWithSuccess.add(request);
        if (request.pendingResolver) {
          request.pendingResolver();
        }
        delete request.pendingResolver;
      }
    };

    page.on('request', this.requestListener);
    page.on('requestfailed', this.requestFailedListener);
    page.on('requestfinished', this.requestFinishedListener);
  }

  removePageListeners(): void {
    this.page.off('request', this.requestListener);
    this.page.off('requestfailed', this.requestFailedListener);
    this.page.off('requestfinished', this.requestFinishedListener);
  }

  async waitForAllRequestsFinished(): Promise<void> {
    if (this.pendingRequestsCount() === 0) {
      return;
    }
    await Promise.all(this.promises);
  }

  async waitOnceForAllRequestsFinished(): Promise<void> {
    await this.waitForAllRequestsFinished();

    this.removePageListeners();
  }

  pendingRequestsCount(): number {
    return this.pendingRequests.size;
  }

  private handleResourceType(resourceType: ResourceType): boolean {
    if (this.resourceTypes === 'any') {
      return true;
    }

    return this.resourceTypes.includes(resourceType);
  }
}
