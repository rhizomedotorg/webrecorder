#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from "module";
const require = createRequire(import.meta.url);

require('@babel/register');
/*
({
  only: [/node_modules(\/|\\)react-rte/]
});*/

// ignore css imports within react-rte
require.extensions['.css'] = () => {};


/**
 * Define isomorphic constants.
 */
global.__CLIENT__ = false;
global.__SERVER__ = true;
global.__DISABLE_SSR__ = process.env.DISABLE_SSR ? process.env.DISABLE_SSR === 'true' : false;
global.__PLAYER__ = false;
global.__DESKTOP__ = false;
global.__DEVELOPMENT__ = process.env.NODE_ENV !== 'production';

const waitForFile = (filename) => {
  let checkCount = 0;
  const fn = path.resolve(process.cwd(), filename);
  const checkForFile = (path) => {
    const exists = fs.existsSync(path);

    if (exists) {
      const contents = fs.readFileSync(path, 'utf8');
      if (!contents) {
        return false;
      }
      return true;
    }

    return false;
  };

  return new Promise((resolve) => {
    const check = () => {
      if (checkForFile(fn)) {
        console.log(`Found ${fn}!`);
        resolve(fn);
      } else if (checkCount++ < 300) {
        setTimeout(check, 300);
        if (checkCount % 10 === 0) {
          console.log(`Waiting for ${fn}...`);
        }
      }
    };
    check();
  });
};

const runner = async () => {
  const server = (await import(await waitForFile('static/server/server.js'))).default;
  const manifest = (await import(await waitForFile('static/dist/webpack-manifest.json'), { assert: { type: "json" } })).default;

    // let's go!
  console.log('starting server');
  server(manifest);
};

runner();