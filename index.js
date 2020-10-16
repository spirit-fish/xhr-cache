import xhook from 'xhook';

const noop = () => {
  return;
};
const truthy = () => true;
const passthrough = f => f;

const xhrCache = {
  scriptTag: null,
  scriptTagId: 'spirit-fish-xhr-cache',
  data: {},
  makeCacheKey: passthrough,
  setup: options => {
    /* Restore Data */
    const existing = document.getElementById(xhrCache.scriptTagId);
    if (existing) {
      xhrCache.scriptTag = existing;
    } else {
      const script = document.createElement('script');
      script.id = xhrCache.scriptTagId;
      script.type = 'text/javascript';
      script.innerHTML = 'window.SPIRIT_FISH_XHR_CACHE = {}';
      document.getElementsByTagName('head')[0].appendChild(script);
      xhrCache.scriptTag = script;
    }
    xhrCache.data = window.SPIRIT_FISH_XHR_CACHE;

    const shouldCache = (options && options.shouldCache) || truthy;
    xhrCache.makeCacheKey = (options && options.makeCacheKey) || passthrough;
    const shouldLog = (options && options.shouldLog) || truthy;
    const didError = (options && options.didError) || noop;

    /* Setup XHR Hooks */
    xhook.before(function(request, callback) {
      if (request.method !== 'GET') return callback();
      try {
        const existing = xhrCache.get(request.url);
        if (!existing) {
          if (shouldLog(request.url)) {
            console.info(
              `Spirit Fish XHR Cache MISS - ${request.method} ${request.url}`
            );
          }
          return callback();
        }
        request.SPIRIT_FISH_CACHE_HIT = true;
        if (shouldLog(request.url)) {
          console.info(
            `Spirit Fish XHR Cache HIT - ${request.method} ${request.url}`
          );
        }
        return callback(existing);
      } catch (e) {
        if (shouldLog(request.url)) {
          console.warn(`Spirit Fish XHR Cache ERROR - ${e && e.message}`);
        }
        didError(request.url, e, 'RESTORE_RESPONSE');
        return callback();
      }
    });

    xhook.after(function(request, response) {
      if (request.method !== 'GET') return;
      if (request.SPIRIT_FISH_CACHE_HIT) return;
      if (!shouldCache(request.url)) return;
      try {
        xhrCache.set(request.url, response);
        if (shouldLog(request.url)) {
          console.log(
            `Spirit Fish XHR Cache STORE - ${request.method} ${request.url}`
          );
        }
      } catch (e) {
        didError(request.url, e, 'CACHE_RESPONSE');
        if (shouldLog(request.url)) {
          console.warn(`Spirit Fish XHR Cache STORE_ERROR - ${e && e.message}`);
        }
      }
    });
  },
  publish: () => {
    xhrCache.scriptTag.innerHTML = `window.SPIRIT_FISH_XHR_CACHE = ${JSON.stringify(
      xhrCache.data
    )}`;
  },
  get: url => {
    return xhrCache.data[url];
  },
  set: (url, data) => {
    xhrCache.data[xhrCache.makeCacheKey(url)] = data;
    /* No need to cache in the head of the doc unless we're running in Spirit Fish */
    if (window.SPIRIT_FISH) {
      xhrCache.publish();
    }
    return data;
  }
};

export default xhrCache;
