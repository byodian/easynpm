import ora from "ora";

export const createSnipper = function (err, text) {
  const spinnerText = err
    ? `There appears to be trouble with your network connection. Retrying...`
    : `Loading ${text} dependencies...`;
  const spinner = ora(spinnerText).start();

  return spinner;
};
