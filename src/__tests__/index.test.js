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

const OK_WITH_1_FAIL_XHR = `
<html>
OK_WITH_1_SLOW_XHR
<script>
  var xmlhttp = new XMLHttpRequest();
  var url = 'http://localhost:${xhrBackendPort}/fail';
  
  xmlhttp.open("GET", url, true);
  xmlhttp.send(); 
  
</script>
</html>
`;

const OK_WITH_1_XHR = `
<html>
OK_WITH_1_SLOW_XHR
<script>
  var xmlhttp = new XMLHttpRequest();
  var url = 'http://localhost:${xhrBackendPort}';
  
  xmlhttp.open("GET", url, true);
  xmlhttp.send(); 
  
</script>
</html>
`;

const OK_WITH_1_SLOW_XHR = `
<html>
OK_WITH_1_SLOW_XHR
<script>
setTimeout(() => {
  var xmlhttp = new XMLHttpRequest();
  var url = 'http://localhost:${xhrBackendPort}/infinite';
  
  xmlhttp.open("GET", url, true);
  xmlhttp.send(); 
}, 10);
  
</script>
</html>
`;

const requestHandler = (request, response) => {
  if (request.url === '/with_infinite_xhr') {
    response.statusCode = 200;
    response.end(OK_WITH_1_SLOW_XHR);
  } else if (request.url === '/with_xhr') {
    response.statusCode = 200;
    response.end(OK_WITH_1_XHR);
  } else if (request.url === '/with_xhr_failing') {
    response.statusCode = 200;
    response.end(OK_WITH_1_FAIL_XHR);
  } else {
    response.statusCode = 200;
    response.end(OK_NO_XHR);
  }
};

const backendRequestHandler = (request, response) => {
  if (request.url === '/infinite') {
    // This xhr will never end
  } else if (request.url === '/fail') {
    response.statusCode = 500;
    response.end('boom');
  } else {
    response.end();
  }
};

let server;
let backendServer;
let browser;

beforeEach(async () => {
  server = http.createServer(requestHandler);
  await server.listen(port);

  backendServer = http.createServer(backendRequestHandler);
  await backendServer.listen(xhrBackendPort);

  const args = [];
  if (process.env.CI) {
    args.push('--no-sandbox');
  }
  browser = await puppeteer.launch({
    headless: true,
    args,
  });
});

afterEach(async () => {
  await server.close();
  await backendServer.close();
});

describe('PendingXHR', () => {
  describe('pendingXhrCount', () => {
    it('returns 0 if no xhr pending count', async () => {
      const page = await browser.newPage();
      const pendingXHR = new PendingXHR(page);
      await page.goto(`http://localhost:${port}/no_xhr`);
      expect(pendingXHR.pendingXhrCount()).toEqual(0);
    });

    it('returns the xhr pending count', async () => {
      const page = await browser.newPage();
      const pendingXHR = new PendingXHR(page);
      await page.goto(`http://localhost:${port}/with_infinite_xhr`);
      await sleep(20);
      expect(pendingXHR.pendingXhrCount()).toEqual(1);
    });
  });

  describe('waitForAllXhrFinished', async () => {
    it('returns immediatly if no xhr pending count', async () => {
      const page = await browser.newPage();
      const pendingXHR = new PendingXHR(page);
      await page.goto(`http://localhost:${port}/no_xhr`);
      await pendingXHR.waitForAllXhrFinished();
    });

    it('waits for all xhr to end', async () => {
      const page = await browser.newPage();
      const pendingXHR = new PendingXHR(page);
      await page.goto(`http://localhost:${port}/with_xhr`);
      expect(pendingXHR.pendingXhrCount()).toEqual(1);
      await pendingXHR.waitForAllXhrFinished();
      expect(pendingXHR.pendingXhrCount()).toEqual(0);
    });

    it('handle correctly failed xhr', async () => {
      const page = await browser.newPage();
      const pendingXHR = new PendingXHR(page);
      await page.goto(`http://localhost:${port}/with_xhr_failing`);
      expect(pendingXHR.pendingXhrCount()).toEqual(1);
      await pendingXHR.waitForAllXhrFinished();
      expect(pendingXHR.pendingXhrCount()).toEqual(0);
    });
  });
});
