const PendingXHR = require('../index').PendingXHR;
const http = require('http');
const puppeteer = require('puppeteer');
const port = 8907;
const xhrBackendPort = 8908;

const OK_NO_XHR = `
<html>
OK_NO_XHR
</html>
`;

const OK_WITH_1_SLOW_XHR = `
<html>
OK_WITH_1_SLOW_XHR
</html>
`;

const requestHandler = (request, response) => {
  console.log(request);
  response.statusCode = 200;
  response.end(OK_NO_XHR);
};

const backendRequestHandler = (request, response) => {
  console.log(request);
  response.statusCode = 200;
  response.end({ status: 'OK' });
}

let server;
let backendServer;
let browser;

beforeEach(async () => {
  server = http.createServer(requestHandler);
  await server.listen(port);

  backendServer = http.createServer(backendRequestHandler);
  await backendServer.listen(xhrBackendPort);

  browser = await puppeteer.launch({ headless: true });
});

afterEach(async () => {
  await server.close();
  await backendServer.close();
});

describe('PendingXHR', () => {

  describe('pendingXhrCount', () => {
    it('returns 0 if no xhr pending count', async () => {
      const page = await browser.newPage(`http://localhost:${port}/no_xhr`);
      const pendingXHR = new PendingXHR(page);
      expect(pendingXHR.pendingXhrCount()).toEqual(0);
    });

    it('returns the xhr pending count', async () => {
      const page = await browser.newPage(`http://localhost:${port}/with_xhr`);
      const pendingXHR = new PendingXHR(page);
      expect(pendingXHR.pendingXhrCount()).toEqual(1);
    });
  });

  describe('waitForAllXhrFinished', async () => {
    it('returns immediatly if no xhr pending count', async () => {
      const page = await browser.newPage(`http://localhost:${port}`);
      const pendingXHR = new PendingXHR(page);
      await pendingXHR.waitForAllXhrFinished();
    });
    
  });

});