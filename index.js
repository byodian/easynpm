#!/usr/bin/env node

import chalk from 'chalk';
import { get } from './utils/request.js';
import { toTwoNumber } from './utils/toTwoNumber.js';
import { httpsAgent } from './utils/getHttpsAgent.js';
import * as cheerio from 'cheerio';
import ora from 'ora';

const rawArg = process.argv.slice(2);
const NPM_LINK = 'https://npmjs.com/package';
const log = console.log;

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

const createSnipper = function (err, text) {
  const spinnerText = err
    ? `There appears to be trouble with your network connection. Retrying...`
    : `Loading ${text} dependencies...`;
  const spinner = ora(spinnerText).start();

  const stop = function (type = 'success') {
    spinner.stopAndPersist({
      text:
        type === 'success' ? 'Congratulations!' : 'Opps something was wrong!',
      symbol: type === 'success' ? chalk.green('✔️') : chalk.red('✖️'),
    });
  };

  return {
    spinner,
    stop,
  };
};

const getDependencies = async function (err, repositoryName) {
  const spinner = createSnipper(err, repositoryName);

  try {
    const { dependencies, devDependencies } = await getPackages(repositoryName);
    spinner.stop();

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
      spinner.stop('error');
      log(
        chalk.cyan(
          'info',
          chalk.blue('Perhaps you are in mainland china, please break through the firewall to access')
        )
      );
      return;
    }
    spinner.stop('error');
    getDependencies(err, repositoryName);
  }
};

export const init = async function (err, name) {
  if (!name) {
    log(
      chalk.cyan(
        'info',
        chalk.blue('Please enter the name of a open source project')
      )
    );
    return;
  }

  const spinner = createSnipper(err, name);
  try {
    const { repositoryLink, homePageLink } = await getRepoName(name);
    spinner.stop();

    if (!repositoryLink) {
      log(
        chalk.cyan(
          'info',
          chalk.blue('The github link of the open source project')
        )
      );
      return;
    }

    log(chalk.cyan(`${name} repository`, `(${chalk.blue(repositoryLink)})`));
    log(chalk.cyan(`${name} homePage`, `(${chalk.blue(homePageLink)})`));

    const repositoryName = repositoryLink.replace('https://github.com', '');
    await getDependencies(null, repositoryName);
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      spinner.stop('error');
      
      log(
        chalk.cyan(
          'info',
          chalk.blue('Perhaps you are in mainland china, please break through the firewall to access')
        )
      );

      return;
    }
    // go ahead
    spinner.stop('error');
    init(err, name);
  }
};

init(null, rawArg[0]);
