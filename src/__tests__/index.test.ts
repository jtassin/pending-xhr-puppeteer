// import http from 'http';
//
// import delay from 'delay';
// import { chromium, Browser, Page } from 'playwright-core';
//
// import { PendingXHR } from '../index';
//
// let port: number;
//
// const OK_NO_XHR = `
// <html>
// OK_NO_XHR
// </html>
// `;
//
// function getOkWithOneXhr() {
//   return `
//   <html>
//   OK_WITH_1_SLOW_XHR
//   <script>
//     var xmlhttp = new XMLHttpRequest();
//     var url = '/request1';
//
//     xmlhttp.open("GET", url, true);
//     xmlhttp.send();
//
//   </script>
//   </html>
//   `;
// }
//
// function getOkWithOneFailingXhr() {
//   return `
//   <html>
//   OK_WITH_1_SLOW_XHR
//   <script>
//     var xmlhttp = new XMLHttpRequest();
//     var url = 'http://www.doesnotexiststygdfuqkhslijhguklhiomjgheohgdjgdlghdghisd.com';
//
//     xmlhttp.open("GET", url, true);
//     xmlhttp.send();
//
//   </script>
//   </html>
//   `;
// }
//
// function getOkWithTwoXhr() {
//   return `
//   <html>
//   OK_WITH_1_SLOW_XHR
//   <script>
//     var xmlhttp = new XMLHttpRequest();
//     var url = '/request1';
//
//     xmlhttp.open("GET", url, true);
//     xmlhttp.send();
//
//     var xmlhttp2 = new XMLHttpRequest();
//     var url2 = '/request2';
//
//     xmlhttp2.open("GET", url2, true);
//     xmlhttp2.send();
//
//   </script>
//   </html>
//   `;
// }
//
// let request1Resolver: ((param: [number, string]) => void) | undefined;
// const request1Promise = () =>
//   new Promise<[number, unknown]>(resolve => {
//     request1Resolver = resolve;
//   });
//
// let request2Resolver: ((param: [number, string]) => void) | undefined;
// const request2Promise = () =>
//   new Promise<[number, unknown]>(resolve => {
//     request2Resolver = resolve;
//   });
//
// const listenerCount = (page: Page, event: string): Promise<number> =>
//   page.evaluate(() => {
//     const events = Array.from(document.querySelectorAll('*')).reduce<
//       Record<string, number>
//     >((pre, dom) => {
//       const evtObj = getEventListeners(dom);
//       // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
//       Object.keys(evtObj).forEach(evt => {
//         if (typeof pre[evt] === 'undefined') {
//           pre[evt] = 0;
//         }
//         // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
//         pre[evt] += evtObj[evt].length;
//       });
//       return pre;
//     }, {});
//     return Promise.resolve(events[event]);
//   });
//
// let server: http.Server;
// let browser: Browser;
//
// describe('PendingXHR', () => {
//   beforeAll(async () => {
//     const args = [];
//     //eslint-disable-next-line no-process-env
//     if (process.env.CI) {
//       args.push('--no-sandbox');
//     }
//     browser = await chromium.launch({
//       headless: true,
//       args,
//     });
//   });
//
//   afterAll(async () => {
//     await browser.close();
//   });
//
//   afterEach(() => {
//     if (request1Resolver) {
//       request1Resolver([0, 'afterEach']);
//     }
//   });
//
//   afterEach(() => {
//     server.close();
//   });
//
//   function startServerReturning(html: string) {
//     //eslint-disable-next-line @typescript-eslint/no-misused-promises
//     server = http.createServer(async (request, response) => {
//       if (request.url === '/go') {
//         response.statusCode = 200;
//         response.end(html);
//       } else if (request.url === '/request1') {
//         const [statusCode, body] = await request1Promise();
//         response.statusCode = statusCode;
//         response.end(body);
//       } else if (request.url === '/request2') {
//         const [statusCode, body] = await request2Promise();
//         response.statusCode = statusCode;
//         response.end(body);
//       }
//     });
//     server = server.listen();
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-member-access
//     port = (server.address()! as any).port;
//   }
//
//   describe('pendingXhrCount', () => {
//     it('returns 0 if no xhr pending count', async () => {
//       startServerReturning(OK_NO_XHR);
//       const page = await browser.newPage();
//       const pendingXHR = new PendingXHR(page);
//       await page.goto(`http://localhost:${port}/go`);
//       expect(pendingXHR.pendingXhrCount()).toEqual(0);
//     });
//
//     it('returns the xhr pending count', async () => {
//       startServerReturning(getOkWithTwoXhr());
//       const page = await browser.newPage();
//       const pendingXHR = new PendingXHR(page);
//       await page.goto(`http://localhost:${port}/go`);
//       expect(pendingXHR.pendingXhrCount()).toEqual(2);
//       setTimeout(() => {
//         request1Resolver!([200, 'first xhr finished']);
//       }, 0);
//       await delay(1000);
//       expect(pendingXHR.pendingXhrCount()).toEqual(1);
//       setTimeout(() => {
//         request2Resolver!([200, 'second xhr finished']);
//       }, 0);
//       await delay(1000);
//       expect(pendingXHR.pendingXhrCount()).toEqual(0);
//     });
//   });
//
//   describe('removePageListeners', () => {
//     it('removes all listenners', async () => {
//       startServerReturning(OK_NO_XHR);
//       const page = await browser.newPage();
//       const count = await listenerCount(page, 'request');
//       const pendingXHR = new PendingXHR(page);
//       await page.goto(`http://localhost:${port}/go`);
//       await pendingXHR.waitForAllXhrFinished();
//       expect(await listenerCount(page, 'request')).toBe(count + 1);
//       pendingXHR.removePageListeners();
//       expect(await listenerCount(page, 'request')).toBe(count);
//     });
//   });
//
//   describe('waitOnceForAllXhrFinished', () => {
//     it('returns and removes all listeners immediatly if no xhr pending', async () => {
//       startServerReturning(OK_NO_XHR);
//       const page = await browser.newPage();
//       const count = await listenerCount(page, 'request');
//       const pendingXHR = new PendingXHR(page);
//       await page.goto(`http://localhost:${port}/go`);
//       await pendingXHR.waitOnceForAllXhrFinished();
//       expect(await listenerCount(page, 'request')).toBe(count);
//     });
//
//     describe('one XHR', () => {
//       it('resolves removes all listeners once finished', async () => {
//         startServerReturning(getOkWithOneXhr());
//         const page = await browser.newPage();
//         const count = await listenerCount(page, 'request');
//         const pendingXHR = new PendingXHR(page);
//         await page.goto(`http://localhost:${port}/go`);
//         expect(pendingXHR.pendingXhrCount()).toEqual(1);
//         setTimeout(() => {
//           request1Resolver!([200, '']);
//         }, 0);
//         await pendingXHR.waitOnceForAllXhrFinished();
//         expect(pendingXHR.pendingXhrCount()).toEqual(0);
//         expect(await listenerCount(page, 'request')).toBe(count);
//       });
//     });
//
//     describe('several XHR', () => {
//       it('resolves removes all listeners once finished', async () => {
//         startServerReturning(getOkWithTwoXhr());
//         const page = await browser.newPage();
//         const count = await listenerCount(page, 'request');
//         const pendingXHR = new PendingXHR(page);
//         await page.goto(`http://localhost:${port}/go`);
//         expect(pendingXHR.pendingXhrCount()).toEqual(2);
//         setTimeout(() => {
//           request1Resolver!([200, '']);
//         }, 0);
//         setTimeout(() => {
//           request2Resolver!([200, '']);
//         }, 0);
//         await pendingXHR.waitOnceForAllXhrFinished();
//         expect(pendingXHR.pendingXhrCount()).toEqual(0);
//         expect(await listenerCount(page, 'request')).toBe(count);
//       });
//     });
//   });
//
//   describe('waitForAllXhrFinished', () => {
//     it('let a listenner connected', async () => {
//       startServerReturning(OK_NO_XHR);
//       const page = await browser.newPage();
//       const count = await listenerCount(page, 'request');
//       const pendingXHR = new PendingXHR(page);
//       await page.goto(`http://localhost:${port}/go`);
//       await pendingXHR.waitForAllXhrFinished();
//       expect(await listenerCount(page, 'request')).toBe(count + 1);
//     });
//     it('returns immediatly if no xhr pending count', async () => {
//       startServerReturning(OK_NO_XHR);
//       const page = await browser.newPage();
//       const pendingXHR = new PendingXHR(page);
//       await page.goto(`http://localhost:${port}/go`);
//       expect(pendingXHR.pendingXhrCount()).toEqual(0);
//       await pendingXHR.waitForAllXhrFinished();
//       expect(pendingXHR.pendingXhrCount()).toEqual(0);
//     });
//
//     it('waits for 1 xhr to end', async () => {
//       startServerReturning(getOkWithOneXhr());
//       const page = await browser.newPage();
//       const pendingXHR = new PendingXHR(page);
//       await page.goto(`http://localhost:${port}/go`);
//       expect(pendingXHR.pendingXhrCount()).toEqual(1);
//       setTimeout(() => {
//         request1Resolver!([200, '']);
//       }, 0);
//       await pendingXHR.waitForAllXhrFinished();
//       expect(pendingXHR.pendingXhrCount()).toEqual(0);
//     });
//
//     it('can be trigerred multiple times', async () => {
//       startServerReturning(getOkWithOneXhr());
//       const page = await browser.newPage();
//       const pendingXHR = new PendingXHR(page);
//       await page.goto(`http://localhost:${port}/go`);
//       expect(pendingXHR.pendingXhrCount()).toEqual(1);
//       setTimeout(() => {
//         request1Resolver!([200, '']);
//       }, 0);
//       await pendingXHR.waitForAllXhrFinished();
//       expect(pendingXHR.pendingXhrCount()).toEqual(0);
//       await pendingXHR.waitForAllXhrFinished();
//     });
//
//     it('works with Promise.race', async () => {
//       startServerReturning(getOkWithOneXhr());
//       const page = await browser.newPage();
//       const pendingXHR = new PendingXHR(page);
//       await page.goto(`http://localhost:${port}/go`);
//       setTimeout(() => {
//         request1Resolver!([200, '']);
//       }, 200);
//       await Promise.race([
//         pendingXHR.waitForAllXhrFinished(),
//         new Promise(resolve => {
//           setTimeout(resolve, 100);
//         }),
//       ]);
//       expect(pendingXHR.pendingXhrCount()).toEqual(1);
//
//       await Promise.race([
//         pendingXHR.waitForAllXhrFinished(),
//         new Promise(resolve => {
//           setTimeout(resolve, 300);
//         }),
//       ]);
//       expect(pendingXHR.pendingXhrCount()).toEqual(0);
//     });
//
//     it('waits for 2 xhr to end', async () => {
//       startServerReturning(getOkWithTwoXhr());
//       const page = await browser.newPage();
//       const pendingXHR = new PendingXHR(page);
//       await page.goto(`http://localhost:${port}/go`);
//       expect(pendingXHR.pendingXhrCount()).toEqual(2);
//       setTimeout(() => {
//         request1Resolver!([200, 'first xhr finished']);
//       }, 0);
//       setTimeout(() => {
//         request2Resolver!([200, 'second xhr finished']);
//       }, 200);
//       await pendingXHR.waitForAllXhrFinished();
//       expect(pendingXHR.pendingXhrCount()).toEqual(0);
//     });
//
//     it('handle correctly failed xhr', async () => {
//       startServerReturning(getOkWithOneFailingXhr());
//       const page = await browser.newPage();
//       const pendingXHR = new PendingXHR(page);
//       await page.goto(`http://localhost:${port}/go`);
//       expect(pendingXHR.pendingXhrCount()).toEqual(1);
//       await pendingXHR.waitForAllXhrFinished();
//       expect(pendingXHR.pendingXhrCount()).toEqual(0);
//     });
//   });
// });
