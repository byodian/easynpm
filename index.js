#!/usr/bin/env node

import chalk from 'chalk';
import { get } from './utils/request.js';
import { toTwoNumber } from './utils/toTwoNumber.js';
import { httpsAgent } from './utils/getHttpsAgent.js';
import { createSnipper } from './utils/createSnipper.js';
import * as cheerio from 'cheerio';

const rawArg = process.argv.slice(2);
const NPM_LINK = 'https://npmjs.com/package';
const log = console.log;

export const handleError = (snipper) => {
  const warning = 'Perhaps you are in mainland china, please break through the firewall to access';

  snipper.stop('error');
  log(chalk.cyan('info', chalk.blue(warning)));
}

export const printDepLink = function (deps) {
  Object.keys(deps).forEach((key, index) => {
    const depLink = chalk.blue(`${NPM_LINK}/${key}`);
    const serialNum = toTwoNumber(index + 1);

    log(chalk.cyan(`${serialNum}.`, key, `(${depLink})`));
  });
};

export const getRepoName = async function (name) {
  const response = await get(`${NPM_LINK}/${name}`, {
    agent: httpsAgent,
    headers: { 'Content-Type': 'text/html' },
  });
  const document = await response.text();
  const $ = cheerio.load(document);

  return {
    repositoryLink: $('#repository-link').parent().attr('href'),
    homePageLink: $('#homePage-link').parent().attr('href'),
  };
};

export const getPackages = async function (repoName) {
  const rawGithub = `https://raw.githubusercontent.com/${repoName}/main/package.json`;
  const response = await get(rawGithub, {
    agent: httpsAgent,
    headers: { 'Content-Type': 'application/json' },
  });
  const { dependencies, devDependencies } = await response.json();

  return {
    dependencies,
    devDependencies,
  };
};

const getDependencies = async function (err, repositoryName) {
  const snipper = createSnipper(err, repositoryName);
  try {
    const { dependencies, devDependencies } = await getPackages(repositoryName);
    snipper.succeed('Congratulations!');

    if (devDependencies) {
      log(chalk.gray.bold('devDependencies'));
      printDepLink(devDependencies);
    }

    if (dependencies) {
      log(chalk.gray.bold('dependencies'));
      printDepLink(dependencies);
    }
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      handleError(snipper);
      return;
    }
    snipper.fail();
    getDependencies(err, repositoryName);
  }
};

export const init = async function (err, name) {
  if (!name) {
    log(chalk.cyan('info', chalk.blue('Please enter the name of a open source project')));
    return;
  }

  const snipper = createSnipper(err, name);
  try {
    const { repositoryLink, homePageLink } = await getRepoName(name);
    snipper.succeed('Congratulations!');

    if (!repositoryLink) {
      log(chalk.cyan('info', chalk.blue('The github link of the open source project')));
      return;
    }

    log(chalk.cyan(`${name} repository`, `(${chalk.blue(repositoryLink)})`));
    log(chalk.cyan(`${name} homePage`, `(${chalk.blue(homePageLink)})`));

    const repositoryName = repositoryLink.replace('https://github.com', '');
    await getDependencies(null, repositoryName);
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      handleError(snipper);
      return;
    }
    // go ahead
    snipper.fail();
    init(err, name);
  }
};

init(null, rawArg[0]);
