class PendingXHR {

  constructor(page) {
    this.page = page;
    this.resourceType = 'xhr';
    // page.setRequestInterception(true);
    this.pendingXhrs = new Set();
    this.finishedWithSuccessXhrs = new Set();
    this.finishedWithErrorsXhrs = new Set();
    page.on('request', request => {
      console.log(Date.now(), 'new request', request.resourceType(), ' to ', request.url());
      if (request.resourceType() === this.resourceType) {
        this.pendingXhrs.add(request);
        if(!this.promise) {
          this.promise = new Promise((resolve, reject) => {
            this.resolver = resolve;
          });
          this.promise.then(() => {
            console.log('All xhr are ended');
          });
        }       
      }
    });
    page.on('requestfailed', request => {
      if (request.resourceType() === this.resourceType) {
        console.log(this.pendingXhrs);
        this.pendingXhrs.delete(request);
        this.finishedWithErrorsXhrs.add(request);
        if(this.resolver) {
          this.resolver();
          delete this.promise;
          delete this.resolver;
        }
      }
    });
    page.on('requestfinished', request => {
      console.log(Date.now(), 'request finished', request.resourceType(), ' to ', request.url());
      if (request.resourceType() === this.resourceType) {
        this.pendingXhrs.delete(request);
        this.finishedWithSuccessXhrs.add(request);
        if(this.resolver) {
          this.resolver();
          delete this.promise;
          delete this.resolver;
        }
      }
    });
  }

  async waitForAllXhrFinished() {
    if (this.pendingXhrCount() === 0) {
      return true;
    }
    if(this.promise) {
      console.log('promise exists', this.promise);
      await this.promise;
    }
  }

  pendingXhrCount() {
    return this.pendingXhrs.size;
  }
}

module.exports.PendingXHR = PendingXHR;
