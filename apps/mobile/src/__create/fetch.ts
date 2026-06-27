import { fetch as expoFetch } from 'expo/fetch';

const originalFetch = fetch;

const getURLFromArgs = (...args: Parameters<typeof fetch>) => {
  const [urlArg] = args;
  if (typeof urlArg === 'string') {
    return urlArg;
  }
  if (urlArg instanceof Request) {
    return urlArg.url;
  }
  if (typeof urlArg === 'object' && urlArg !== null && 'href' in urlArg) {
    return (urlArg as URL).href;
  }
  return null;
};

const isFileURL = (url: string) => {
  return url.startsWith('file://') || url.startsWith('data:');
};

const isStaticAssetURL = (url: string) => {
  return /\.(wasm|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|otf|eot)(\?|$)/i.test(url);
};

const isFirstPartyURL = (url: string) => {
  return (
    url.startsWith('/') ||
    (process.env.EXPO_PUBLIC_BASE_URL && url.startsWith(process.env.EXPO_PUBLIC_BASE_URL))
  );
};

type Params = Parameters<typeof expoFetch>;
const fetchToWeb = async function fetchWithHeaders(...args: Params) {
  const baseURL = process.env.EXPO_PUBLIC_BASE_URL;
  if (!baseURL) {
    return expoFetch(...args);
  }
  const [input, init] = args;
  const url = getURLFromArgs(input, init);
  if (!url) {
    return expoFetch(input, init);
  }

  if (isFileURL(url) || isStaticAssetURL(url)) {
    return originalFetch(input, init);
  }

  const isExternalFetch = !isFirstPartyURL(url);
  if (isExternalFetch) {
    return expoFetch(input, init);
  }

  let finalInput = input;
  if (typeof input === 'string') {
    finalInput = input.startsWith('/') ? `${baseURL}${input}` : input;
  } else {
    return expoFetch(input, init);
  }

  return expoFetch(finalInput, init);
};

export default fetchToWeb;
