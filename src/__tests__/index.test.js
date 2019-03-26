const PendingXHR = require('../index').PendingXHR;
const http = require('http');
const puppeteer = require('puppeteer');
const port = 8907;
const xhrBackendPort = 8908;

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
async function sleep(delay) {
  await timeout(delay);
  return;
}

const OK_NO_XHR = `
<html>
OK_NO_XHR
</html>
`;

const OK_WITH_1_XHR = `
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

const OK_WITH_2_XHR = `
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

let request1Resolver;
const request1Promise = () => {
  return new Promise(resolve => {
    request1Resolver = resolve;
  });
};

let request2Resolver;
const request2Promise = () => {
  return new Promise(resolve => {
    request2Resolver = resolve;
  });
};

const backendRequestHandler = async (request, response) => {
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

let server;
let backendServer;
let browser;

describe('PendingXHR', () => {
  beforeAll(async () => {
    const args = [];
    if (process.env.CI) {
      args.push('--no-sandbox');
    }
    browser = await puppeteer.launch({
      headless: true,
      args,
    });
  });

  beforeEach(async () => {
    backendServer = http.createServer(backendRequestHandler);
    await backendServer.listen(xhrBackendPort);
  });

  afterAll(async () => {
    await browser.close();
  });

  afterEach(async () => {
    if (request1Resolver) {
      await request1Resolver();
    }
  });

  afterEach(cb => {
    backendServer.close(cb);
  });

  afterEach(cb => {
    server.close(cb);
  });

  async function startServerReturning(html) {
    server = http.createServer((request, response) => {
      response.statusCode = 200;
      response.end(html);
    });
    await server.listen(port);
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
      await startServerReturning(OK_WITH_2_XHR);
      const page = await browser.newPage();
      const pendingXHR = new PendingXHR(page);
      await page.goto(`http://localhost:${port}/go`);
      expect(pendingXHR.pendingXhrCount()).toEqual(2);
      setTimeout(() => {
        request1Resolver([200, 'first xhr finished']);
      });
      await sleep(10);
      expect(pendingXHR.pendingXhrCount()).toEqual(1);
      setTimeout(() => {
        request2Resolver([200, 'second xhr finished']);
      });
      await sleep(10);
      expect(pendingXHR.pendingXhrCount()).toEqual(0);
    });
  });

  describe('waitForAllXhrFinished', () => {
    it('returns immediatly if no xhr pending count', async () => {
      await startServerReturning(OK_NO_XHR);
      const page = await browser.newPage();
      const pendingXHR = new PendingXHR(page);
      await page.goto(`http://localhost:${port}/go`);
      await pendingXHR.waitForAllXhrFinished();
    });

    it('waits for 1 xhr to end', async () => {
      await startServerReturning(OK_WITH_1_XHR);
      const page = await browser.newPage();
      const pendingXHR = new PendingXHR(page);
      await page.goto(`http://localhost:${port}/go`);
      expect(pendingXHR.pendingXhrCount()).toEqual(1);
      setTimeout(() => {
        request1Resolver([200, '']);
      });
      await pendingXHR.waitForAllXhrFinished();
      expect(pendingXHR.pendingXhrCount()).toEqual(0);
    });

    it('works with Promise.race', async () => {
      await startServerReturning(OK_WITH_1_XHR);
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
      await startServerReturning(OK_WITH_2_XHR);
      const page = await browser.newPage();
      const pendingXHR = new PendingXHR(page);
      await page.goto(`http://localhost:${port}/go`);
      expect(pendingXHR.pendingXhrCount()).toEqual(2);
      setTimeout(() => {
        request1Resolver([200, 'first xhr finished']);
      });
      setTimeout(() => {
        request2Resolver([200, 'second xhr finished']);
      }, 200);
      await pendingXHR.waitForAllXhrFinished();
      expect(pendingXHR.pendingXhrCount()).toEqual(0);
    });

    it('handle correctly failed xhr', async () => {
      await startServerReturning(OK_WITH_1_XHR);
      const page = await browser.newPage();
      const pendingXHR = new PendingXHR(page);
      await page.goto(`http://localhost:${port}/go`);
      expect(pendingXHR.pendingXhrCount()).toEqual(1);
      setTimeout(() => {
        request1Resolver([500, 'boom']);
      });
      await pendingXHR.waitForAllXhrFinished();
      expect(pendingXHR.pendingXhrCount()).toEqual(0);
    });
  });
});
