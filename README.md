# Pending XHR Puppeteer

[![Build Status](https://travis-ci.org/jtassin/pending-xhr-puppeteer.svg?branch=master)](https://travis-ci.org/jtassin/pending-xhr-puppeteer)

<p align="center">
  | <b><a href="#introduction">Introduction</a></b>
  | <b><a href="#installation">Installation</a></b>
  | <b><a href="#usage">Usage</a></b>
  | <b><a href="#contribute">Contribute</a></b> |
</p>

## Introduction

Pending XHR Puppeteer is a tool that detect when their is xhr requests not yet finished. You can use it to have a xhr requests count or to wait for all xhr requests to be finished.

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

## Contribute

```bash
git clone https://github.com/jtassin/pending-xhr-puppeteer.git
cd pending-xhr-puppeteer
yarn
yarn test
```

Merge request and issues are welcome.
