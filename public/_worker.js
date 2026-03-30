// Cloudflare Pages _worker.js — SPA fallback
// Serves index.html for any route that doesn't match a static file
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Serve static assets directly
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;

    // SPA fallback — serve index.html for all non-asset routes
    if (!url.pathname.match(/\.\w{1,8}$/)) {
      return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
    }

    return response;
  },
};
