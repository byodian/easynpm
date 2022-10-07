import fetch from 'node-fetch'

export const get = async (url, options) => {
  const reqOpts = {
    method: 'GET',
    timeout: '30000',
    ...options
  };

  return await fetch(url, reqOpts);
} 
