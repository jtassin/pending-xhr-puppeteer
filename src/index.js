class PendingXHR {
  constructor(page) {
    this.page = page;
    this.resourceType = 'xhr';
    // page.setRequestInterception(true);
    this.pendingXhrs = new Set();
    this.finishedWithSuccessXhrs = new Set();
    this.finishedWithErrorsXhrs = new Set();
    this.promisees = [];
    page.on('request', request => {
      if (request.resourceType() === this.resourceType) {
        this.pendingXhrs.add(request);
        this.promisees.push(
          new Promise(resolve => {
            request.resolver = resolve;
          }),
        );
      }
    });
    page.on('requestfailed', request => {
      if (request.resourceType() === this.resourceType) {
        this.pendingXhrs.delete(request);
        this.finishedWithErrorsXhrs.add(request);
        if (request.resolver) {
          request.resolver();
          delete request.resolver;
        }
      }
    });
    page.on('requestfinished', request => {
      if (request.resourceType() === this.resourceType) {
        this.pendingXhrs.delete(request);
        this.finishedWithSuccessXhrs.add(request);
        if (request.resolver) {
          request.resolver();
          delete request.resolver;
        }
      }
    });
  }

  async waitForAllXhrFinished() {
    if (this.pendingXhrCount() === 0) {
      return true;
    }
    await Promise.all(this.promisees);
  }

  pendingXhrCount() {
    return this.pendingXhrs.size;
  }
}

module.exports.PendingXHR = PendingXHR;
