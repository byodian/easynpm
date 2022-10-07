import chalk from 'chalk';
import { get } from './utils/request.js';
import { httpsAgent } from './utils/getHttpsAgent.js'
import * as cheerio from 'cheerio';
import ora from 'ora'

const rawArg = process.argv.slice(2);

export const getRepoName = async function(name) {
  const NPM_URL = `https://npmjs.com/package/${name}`;
  const response = await get(NPM_URL, {
    agent: httpsAgent,
    headers: { 'Content-Type': 'text/html' }
  });
  const document = await response.text();
  const $ = cheerio.load(document);

  return {
    repositoryLink: $('#repository-link').parent().attr('href'),
    homePageLink: $('#homePage-link').parent().attr('href')
  }
}

export const getPackages = async function(repoName) {
  const rawGithub = `https://raw.githubusercontent.com/${repoName}/main/package.json`;
  const response = await get(rawGithub, {
    agent: httpsAgent,
    headers: { 'Content-Type': 'application/json' }
  });
  const { dependencies, devDependencies } = await response.json();

  return {
    dependencies,
    devDependencies
  }
}

const createSnipper = function(err, text) {
  const spinnerText = err ? `There appears to be trouble with your network connection. Retrying...` : `Loading ${text} dependencies...`
  const spinner = ora(spinnerText).start();

  const stop = function(type = 'success') {
    spinner.stopAndPersist({
      text: type === 'success' ? 'Congratulations!' : 'Opps something was wrong!',
      symbol: type === 'success' ? chalk.green('✔️') : chalk.red('✖️')
    })
  }

  return {
    spinner,
    stop
  }
}

const getDependencies = async function(err, repositoryName) {
  const spinner = createSnipper(err, repositoryName)

  try {
    const { dependencies, devDependencies } = await getPackages(repositoryName)
    spinner.stop()

    if (devDependencies) {
      console.log(chalk.gray.bold('devDependencies'));
      Object.keys(devDependencies).forEach(key => {
        console.log(chalk.cyan(key,'👉', chalk.blue(`https://npmjs.com/package/${key}`)))
      })
    }

    if (dependencies) {
      console.log(chalk.gray.bold('dependencies'))
      Object.keys(dependencies).forEach(key => {
        console.log(chalk.cyan(key, '👉', chalk.blue(`https://npmjs.com/package/${key}`)))
      })
    }

  } catch (err) {
    spinner.stop('error')
    getDependencies(err, repositoryName)
  }
}

export const init = async function(
  err, 
  name, 
) {
  if (!name) {
    console.log(chalk.red('请输入查询内容'))  
    return
  }

  const spinner = createSnipper(err, name)
  try {
    const { repositoryLink, homePageLink } = await getRepoName(name);
    spinner.stop()

    if (!repositoryLink) {
      console.log(chalk.yellow('未找到指定的 github 仓库'));
      return
    }

    console.log(chalk.cyan(`${name} repository 👉`, chalk.blue(repositoryLink)));
    console.log(chalk.cyan(`${name} homePage 👉`, chalk.blue(homePageLink)));

    const repositoryName = repositoryLink.replace('https://github.com', '')
    await getDependencies(null, repositoryName)
  } catch (err) {
    spinner.stop('error')
    init(err, name)
  }
}

init(null, rawArg[0])
