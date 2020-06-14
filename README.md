# Pending XHR Puppeteer

[![npm version](https://badge.fury.io/js/pending-xhr-puppeteer.svg)](https://badge.fury.io/js/pending-xhr-puppeteer)
[![Build Status](https://travis-ci.org/jtassin/pending-xhr-puppeteer.svg?branch=master)](https://travis-ci.org/jtassin/pending-xhr-puppeteer)

<p align="center">
  | <b><a href="#introduction">Introduction</a></b>
  | <b><a href="#installation">Installation</a></b>
  | <b><a href="#usage">Usage</a></b>
  | <b><a href="#contribute">Contribute</a></b> |
</p>

## Introduction

Pending XHR Puppeteer is a tool that detect when there is xhr requests not yet finished. You can use it to have a xhr requests count or to wait for all xhr requests to be finished.

## Installation

To install with yarn :

```bash
yarn add pending-xhr-puppeteer -D
```

To install with npm :

```bash
npm install pending-xhr-puppeteer --save-dev
```

## Usage

### wait for all xhr requests to be finished

```javascript
const puppeteer = require('puppeteer');
const { PendingXHR } = require('pending-xhr-puppeteer');

const browser = await puppeteer.launch({
  headless: true,
  args,
});

const page = await browser.newPage();
const pendingXHR = new PendingXHR(page);
await page.goto(`http://page-with-xhr`);
// Here all xhr requests are not finished
await pendingXHR.waitForAllXhrFinished();
// Here all xhr requests are finished
```

### Get the number of pending xhr

```javascript
const puppeteer = require('puppeteer');
const { PendingXHR } = require('pending-xhr-puppeteer');

const browser = await puppeteer.launch({
  headless: true,
  args,
});

const page = await browser.newPage();
const pendingXHR = new PendingXHR(page);
await page.goto(`http://page-with-xhr`);
console.log(pendingXHR.pendingXhrCount());
// Display the number of xhr pending
```

### Usage with Promise.race

If you need to wait xhrs but not longer than a specific time, You can race **pending-xhr-puppeteer** and `setTimeout` in a `Promise.race`.

```javascript
const puppeteer = require('puppeteer');
const { PendingXHR } = require('pending-xhr-puppeteer');

const browser = await puppeteer.launch({
  headless: true,
  args,
});

const page = await browser.newPage();
const pendingXHR = new PendingXHR(page);
await page.goto(`http://page-with-xhr`);
// We will wait max 1 seconde for xhrs
await Promise.race([
  pendingXHR.waitForAllXhrFinished(),
  new Promise(resolve => {
    setTimeout(resolve, 1000);
  }),
]);
console.log(pendingXHR.pendingXhrCount());
// May or may not have pending xhrs
```

## Wait for all xhr triggered by all the events of the page

You can use this lib to wait for xhr triggered by any event from the UI (click, typing, ...).

Exemple :

```javascript
const pendingXHR = new PendingXHR(page);
await page.goto(`http://page-with-xhr`);
await page.click('.my-selector'); // This action will trigger some xhr
// Here all xhr requests triggered by the click are not finished
await pendingXHR.waitForAllXhrFinished();
// Here all xhr requests triggered by the click are finished
// You can then perform an other xhr producer event
await page.click('.my-selector2'); // This action will trigger some xhr
// You can rewait them
await pendingXHR.waitForAllXhrFinished();
```

This mode is usefull to test SPA, you d'ont have to recreate a new instance at each time.
The request listeners will be deleted when you leave the page.

## Wait for all xhr triggered by an event of the page

with `waitOnceForAllXhrFinished` you can wait until all the xhr are finished and them remove the listeners.
This is usefull when `waitForAllXhrFinished` has a leaking behaviour for you.

Exemple :

```javascript
const pendingXHR = new PendingXHR(page);
await page.goto(`http://page-with-xhr`);
await page.click('.my-selector'); // This action will trigger some xhr
// Here all xhr requests triggered by the click are not finished
await pendingXHR.waitOnceForAllXhrFinished();
// Here all xhr requests triggered by the click are finished
// All pendingXHR listeners are remove here too
```

## Contribute

```bash
git clone https://github.com/jtassin/pending-xhr-puppeteer.git
cd pending-xhr-puppeteer
yarn
yarn test
```

Merge requests and issues are welcome.
