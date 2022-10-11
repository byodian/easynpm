#!/usr/bin/env node

import chalk from 'chalk';
import { get } from './utils/request.js';
import { toTwoNumber } from './utils/toTwoNumber.js';
import { httpsAgent } from './utils/getHttpsAgent.js';
import * as cheerio from 'cheerio';

const rawArg = process.argv.slice(2);
const NPM_LINK = 'https://npmjs.com/package';
const log = console.log;

/**
 * handle network request error
 * @param {Object} snipper - ora instance
 * @returns
 */
export const handleError = (err) => {
  // whether to continue the http request 
  let isContinue = false
  if (err.code !== 'ECONNRESET') {
    const warning = 'Perhaps you are in mainland china, please break through the firewall to access';

    log(chalk.cyan('info', chalk.blue(warning)));
    log(chalk.cyan('info', chalk.blue(err.message)))
    log('error', JSON.stringify(err, null, 2))

    isContinue = false
  } else {
    isContinue = true
  }

  return isContinue
}


/**
 * Print the informations of dependencies and devDependencies 
 * @param {Object} dep - npm library dependencies
 * @returns
 */
export const printDepLink = function (dep) {
  Object.keys(dep).forEach((key, index) => {
    const depLink = chalk.blue(`${NPM_LINK}/${key}`);
    const serialNum = toTwoNumber(index + 1);

    log(chalk.cyan(serialNum, key, `(${depLink})`));
  });
};


/**
 * returns the repository and homepage of a open source project
 * @param {string} name - repository name
 * @returns
 */
export const getRepoName = async function (name) {
  log(chalk.gray(`Loading ${name}...`))
  const response = await get(`${NPM_LINK}/${name}`, {
    agent: httpsAgent,
    headers: { 'Content-Type': 'text/html' },
  });
  const document = await response.text();
  const $ = cheerio.load(document);
  const repositoryLink = $('#repository-link').parent().attr('href')
  const repositoryName = repositoryLink?.replace('https://github.com/', '')
  log(chalk.cyan('github', chalk.blue(repositoryLink)));
  return { repositoryName };
};

/**
 * returns all dependencies of a open source project
 * @param {string} repositoryName - combination of a project author and name, for example chalk/chalk
 * @returns
 */
export const getPackages = async function (repositoryName) {
  log(chalk.gray(`Loading ${repositoryName}...`))
  const rawGithub = `https://raw.githubusercontent.com/${repositoryName}/main/package.json`;
  const response = await get(rawGithub, {
    agent: httpsAgent,
    headers: { 'Content-Type': 'application/json' },
  });
  const { dependencies, devDependencies } = await response.json();

  if (devDependencies) {
    log(chalk.gray.bold('devDependencies'));
    printDepLink(devDependencies);
  }

  if (dependencies) {
    log(chalk.gray.bold('dependencies'));
    printDepLink(dependencies);
  }
};

/**
 * main function
 * @param {Object} err - http request error
 * @param {string} name - repository name, for example, chalk
 * @returns
 */
export const init = async function (name, callback) {
  if (!name) {
    log(chalk.cyan('info', chalk.blue('Please enter the name of a open source project')));
    return;
  }

  try {
    // take the repository name
    const { repositoryName } = await getRepoName(name);
    await callback(repositoryName)
  } catch (err) {
    const isContinue = handleError(err)
    if (isContinue) {
      console.log(chalk.red(`Load fail. Retrying...`))
      init(name, callback);
    }
  }
};


init(rawArg[0], async (repositoryName) => {
  try {
    await getPackages(repositoryName)
  } catch(err) {
    const isContinue = handleError(err)
    if (isContinue) {
      console.log(chalk.red(`Load fail. Retrying...`))
      getPackages(repositoryName)
    }
  }
});
