class PendingXHR {

  constructor(page) {
    this.page = page;
    this.pendingXhrs = new Set();
    this.finishedWithSuccessXhrs = new Set();
    this.finishedWithErrorsXhrs = new Set();
    page.on('request', request => {
      if (request.resourceType() === 'xhr') {
        this.pendingXhrs.push(request);
      }
    });
    page.on('requestfailed', request => {
      if (request.resourceType() === 'xhr') {
        this.pendingXhrs.delete(request);
        this.finishedWithErrorsXhrs.push(request);
      }
    });
    page.on('requestfinished', request => {
      if (request.resourceType() === 'xhr') {
        this.pendingXhrs.delete(request);
        this.finishedWithSuccessXhrs.push(request);
      }
    });
  }

  async waitForAllXhrFinished() {
    if (this.pendingXhrCount() === 0) {
      return true;
    }
  }

  pendingXhrCount() {
    return this.pendingXhrs.size;
  }
}

module.exports.PendingXHR = PendingXHR;
