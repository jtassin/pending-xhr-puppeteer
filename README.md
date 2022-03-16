# Pending Requests Puppeteer

<!-- [![npm version](https://badge.fury.io/js/pending-xhr-puppeteer.svg)](https://badge.fury.io/js/pending-xhr-puppeteer)
[![Build Status](https://travis-ci.org/jtassin/pending-xhr-puppeteer.svg?branch=master)](https://travis-ci.org/jtassin/pending-xhr-puppeteer) -->

<p align="center">
  | <b><a href="#introduction">Introduction</a></b>
  | <b><a href="#installation">Installation</a></b>
  | <b><a href="#usage">Usage</a></b>
  | <b><a href="#contribute">Contribute</a></b> |
</p>

## Introduction

Pending Requests Puppeteer is a tool that detect when there are HTML requests not yet finished. You can use it to have an HTML request count or to wait for all HTTP requests to be finished.

## Installation

To install with yarn :

```bash
yarn add @mailbutler/pending-requests-puppeteer -D
```

To install with npm :

```bash
npm install @mailbutler/pending-requests-puppeteer --save-dev
```

## Usage

### wait for all requests requests to be finished

```javascript
const puppeteer = require('puppeteer');
const { PendingRequests } = require('pending-requests-puppeteer');

const browser = await puppeteer.launch({
  headless: true,
  args,
});

const page = await browser.newPage();
const pendingRequests = new PendingRequests(page, 'xhr');
await page.goto(`http://page-with-xhr`);
// Here all xhr requests are not finished
await pendingRequests.waitForAllRequestsFinished();
// Here all xhr requests are finished
```

### Get the number of pending requests

```javascript
const puppeteer = require('puppeteer');
const { PendingRequests } = require('pending-requests-puppeteer');

const browser = await puppeteer.launch({
  headless: true,
  args,
});

const page = await browser.newPage();
const pendingRequests = new PendingRequests(page, 'xhr');
await page.goto(`http://page-with-xhr`);
console.log(pendingXHR.pendingRequestCount());
// Display the number of xhr pending
```

### Usage with Promise.race

If you need to wait for HTTP requests, but not longer than a specific time, you can race **pending-requests-puppeteer** and `setTimeout` in a `Promise.race`.

```javascript
const puppeteer = require('puppeteer');
const { PendingRequests } = require('pending-requests-puppeteer');

const browser = await puppeteer.launch({
  headless: true,
  args,
});

const page = await browser.newPage();
const pendingRequests = new PendingRequests(page, 'xhr');
await page.goto(`http://page-with-xhr`);
// We will wait max 1 seconde for xhrs
await Promise.race([
  pendingRequests.waitForAllRequestsFinished(),
  new Promise(resolve => {
    setTimeout(resolve, 1000);
  }),
]);
console.log(pendingRequests.pendingRequestCount());
// May or may not have pending xhrs
```

## Wait for all xhr triggered by all the events of the page

You can use this lib to wait for xhr triggered by any event from the UI (click, typing, ...).

Exemple :

```javascript
const pendingRequests = new PendingRequests(page, 'xhr');
await page.goto(`http://page-with-xhr`);
await page.click('.my-selector'); // This action will trigger some xhr
// Here all xhr requests triggered by the click are not finished
await pendingRequests.waitForAllRequestsFinished();
// Here all xhr requests triggered by the click are finished
// You can then perform an other xhr producer event
await page.click('.my-selector2'); // This action will trigger some xhr
// You can rewait them
await pendingRequests.waitForAllRequestsFinished();
```

This mode is usefull to test SPA, you d'ont have to recreate a new instance at each time.
The request listeners will be deleted when you leave the page.

## Wait for all requests triggered by an event of the page

with `waitOnceForAllRequestsFinished` you can wait until all the HTTP requests are finished and them remove the listeners.
This is usefull when `waitForAllRequestsFinished` has a leaking behaviour for you.

Exemple :

```javascript
const pendingRequests = new PendingRequests(page, 'xhr');
await page.goto(`http://page-with-xhr`);
await page.click('.my-selector'); // This action will trigger some xhr
// Here all xhr requests triggered by the click are not finished
await pendingRequests.waitOnceForAllRequestsFinished();
// Here all xhr requests triggered by the click are finished
// All pendingRequests listeners are removed here too
```

## Contribute

```bash
git clone https://github.com/mailbutler/pending-requests-puppeteer.git
cd pending-requests-puppeteer
yarn
yarn test
```

Merge requests and issues are welcome.
