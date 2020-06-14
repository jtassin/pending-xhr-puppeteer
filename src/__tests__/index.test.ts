import { PendingXHR } from '../index';
import http from 'http';
import delay from 'delay';
import { launch, Browser } from 'puppeteer';
import express from 'express';

let port: number;
let xhrBackendPort: number;

const OK_NO_XHR = `
<html>
OK_NO_XHR
</html>
`;

function getOkWithOneXhr() {
  return `
  <html>
  OK_WITH_1_SLOW_XHR
  <script>
    var xmlhttp = new XMLHttpRequest();
    var url = 'http://localhost:${xhrBackendPort}/request1';
  
    xmlhttp.open("GET", url, true);
    xmlhttp.send();
  
  </script>
  </html>
  `;
}

function getOkWithTwoXhr() {
  return `
  <html>
  OK_WITH_1_SLOW_XHR
  <script>
    var xmlhttp = new XMLHttpRequest();
    var url = 'http://localhost:${xhrBackendPort}/request1';
  
    xmlhttp.open("GET", url, true);
    xmlhttp.send();
  
    var xmlhttp2 = new XMLHttpRequest();
    var url2 = 'http://localhost:${xhrBackendPort}/request2';
  
    xmlhttp2.open("GET", url2, true);
    xmlhttp2.send();
  
  </script>
  </html>
  `;
}


let request1Resolver: Function;
const request1Promise = () => {
  return new Promise<[number, any]>(resolve => {
    request1Resolver = resolve;
  });
};

let request2Resolver: Function;
const request2Promise = () => {
  return new Promise<[number, any]>(resolve => {
    request2Resolver = resolve;
  });
};

const backendRequestHandler = async (request: http.IncomingMessage, response: http.ServerResponse) => {
  if (request.url === '/request1') {
    const [statusCode, body] = await request1Promise();
    response.statusCode = statusCode;
    response.end(body);
  } else if (request.url === '/request2') {
    const [statusCode, body] = await request2Promise();
    response.statusCode = statusCode;
    response.end(body);
  }
};

let server: http.Server;
let backendServer: http.Server;
let browser: Browser;

describe('PendingXHR', () => {
  beforeAll(async () => {
    const args = [];
    if (process.env.CI) {
      args.push('--no-sandbox');
    }
    browser = await launch({
      headless: true,
      args,
    });
  });

  beforeEach(async () => {
    const app = express();
    app.get('/request1', async (_request, response) => {
      const [statusCode, body] = await request1Promise();
      response.statusCode = statusCode;
      response.end(body);
    })
    app.get('/request2', async (_request, response) => {
      const [statusCode, body] = await request2Promise();
      response.statusCode = statusCode;
      response.end(body);
    })
    backendServer = await app.listen();
    xhrBackendPort = (backendServer.address()! as any).port;
  });

  afterAll(async () => {
    await browser.close();
  });

  afterEach(async () => {
    if (request1Resolver) {
      await request1Resolver();
    }
  });

  afterEach(() => {
    backendServer.close()
  });

  afterEach(() => {
    server.close();
  });

  async function startServerReturning(html: string) {
    server = http.createServer((request, response) => {
      response.statusCode = 200;
      response.end(html);
    });
    await server.listen(0);
    port = (server.address()! as any).port;
  }

  describe('pendingXhrCount', () => {
    it('returns 0 if no xhr pending count', async () => {
      await startServerReturning(OK_NO_XHR);
      const page = await browser.newPage();
      const pendingXHR = new PendingXHR(page);
      await page.goto(`http://localhost:${port}/go`);
      expect(pendingXHR.pendingXhrCount()).toEqual(0);
    });

    it('returns the xhr pending count', async () => {
      await startServerReturning(getOkWithTwoXhr());
      const page = await browser.newPage();
      const pendingXHR = new PendingXHR(page);
      await page.goto(`http://localhost:${port}/go`);
      expect(pendingXHR.pendingXhrCount()).toEqual(2);
      setTimeout(() => {
        request1Resolver([200, 'first xhr finished']);
      }, 0);
      await delay(1000);
      expect(pendingXHR.pendingXhrCount()).toEqual(1);
      setTimeout(() => {
        request2Resolver([200, 'second xhr finished']);
      }, 0);
      await delay(1000);
      expect(pendingXHR.pendingXhrCount()).toEqual(0);
    });
  });

  describe('waitOnceForAllXhrFinished', () => {

    it('returns and removes all listeners immediatly if no xhr pending', async () => {
      await startServerReturning(OK_NO_XHR);
      const page = await browser.newPage();
      const count = page.listenerCount('request');
      const pendingXHR = new PendingXHR(page);
      await page.goto(`http://localhost:${port}/go`);
      await pendingXHR.waitOnceForAllXhrFinished();
      expect(page.listenerCount('request')).toBe(count)
    });

    describe.skip('one XHR', () => {
      it('resolves removes all listeners once finished', async () => {
        await startServerReturning(getOkWithOneXhr());
        const page = await browser.newPage();
        const count = page.listenerCount('request');
        const pendingXHR = new PendingXHR(page);
        await page.goto(`http://localhost:${port}/go`);
        expect(pendingXHR.pendingXhrCount()).toEqual(1);
        await pendingXHR.waitOnceForAllXhrFinished();
        expect(pendingXHR.pendingXhrCount()).toEqual(0);
        expect(page.listenerCount('request')).toBe(count)
      })

    })

    describe.skip('several XHR', () => {
      it('resolves removes all listeners once finished', async () => {
        await startServerReturning(getOkWithTwoXhr());
        const page = await browser.newPage();
        const count = page.listenerCount('request');
        const pendingXHR = new PendingXHR(page);
        await page.goto(`http://localhost:${port}/go`);
        expect(pendingXHR.pendingXhrCount()).toEqual(2);
        await pendingXHR.waitOnceForAllXhrFinished();
        expect(pendingXHR.pendingXhrCount()).toEqual(0);
        expect(page.listenerCount('request')).toBe(count)
      })
    })


  })

  describe('waitForAllXhrFinished', () => {

    it('let a listenner connected', async () => {
      await startServerReturning(OK_NO_XHR);
      const page = await browser.newPage();
      const count = page.listenerCount('request');
      const pendingXHR = new PendingXHR(page);
      await page.goto(`http://localhost:${port}/go`);
      await pendingXHR.waitForAllXhrFinished();
      expect(page.listenerCount('request')).toBe(count + 1)
    })
    it('returns immediatly if no xhr pending count', async () => {
      await startServerReturning(OK_NO_XHR);
      const page = await browser.newPage();
      const pendingXHR = new PendingXHR(page);
      await page.goto(`http://localhost:${port}/go`);
      await pendingXHR.waitForAllXhrFinished();
    });

    it('waits for 1 xhr to end', async () => {
      await startServerReturning(getOkWithOneXhr());
      const page = await browser.newPage();
      const pendingXHR = new PendingXHR(page);
      await page.goto(`http://localhost:${port}/go`);
      expect(pendingXHR.pendingXhrCount()).toEqual(1);
      setTimeout(() => {
        request1Resolver([200, '']);
      }, 0);
      await pendingXHR.waitForAllXhrFinished();
      expect(pendingXHR.pendingXhrCount()).toEqual(0);
    });

    it('can be trigerred multiple times', async () => {
      await startServerReturning(getOkWithOneXhr());
      const page = await browser.newPage();
      const pendingXHR = new PendingXHR(page);
      await page.goto(`http://localhost:${port}/go`);
      expect(pendingXHR.pendingXhrCount()).toEqual(1);
      setTimeout(() => {
        request1Resolver([200, '']);
      }, 0);
      await pendingXHR.waitForAllXhrFinished();
      expect(pendingXHR.pendingXhrCount()).toEqual(0);
      await pendingXHR.waitForAllXhrFinished();
    });

    it('works with Promise.race', async () => {
      await startServerReturning(getOkWithOneXhr());
      const page = await browser.newPage();
      const pendingXHR = new PendingXHR(page);
      await page.goto(`http://localhost:${port}/go`);
      setTimeout(() => {
        request1Resolver([200, '']);
      }, 200);
      await Promise.race([
        pendingXHR.waitForAllXhrFinished(),
        new Promise(resolve => {
          setTimeout(resolve, 100);
        }),
      ]);
      expect(pendingXHR.pendingXhrCount()).toEqual(1);

      await Promise.race([
        pendingXHR.waitForAllXhrFinished(),
        new Promise(resolve => {
          setTimeout(resolve, 300);
        }),
      ]);
      expect(pendingXHR.pendingXhrCount()).toEqual(0);
    });

    it('waits for 2 xhr to end', async () => {
      await startServerReturning(getOkWithTwoXhr());
      const page = await browser.newPage();
      const pendingXHR = new PendingXHR(page);
      await page.goto(`http://localhost:${port}/go`);
      expect(pendingXHR.pendingXhrCount()).toEqual(2);
      setTimeout(() => {
        request1Resolver([200, 'first xhr finished']);
      }, 0);
      setTimeout(() => {
        request2Resolver([200, 'second xhr finished']);
      }, 200);
      await pendingXHR.waitForAllXhrFinished();
      expect(pendingXHR.pendingXhrCount()).toEqual(0);
    });

    it('handle correctly failed xhr', async () => {
      await startServerReturning(getOkWithOneXhr());
      const page = await browser.newPage();
      const pendingXHR = new PendingXHR(page);
      await page.goto(`http://localhost:${port}/go`);
      expect(pendingXHR.pendingXhrCount()).toEqual(1);
      setTimeout(() => {
        request1Resolver([500, 'boom']);
      }, 0);
      await pendingXHR.waitForAllXhrFinished();
      expect(pendingXHR.pendingXhrCount()).toEqual(0);
    });
  });
});
