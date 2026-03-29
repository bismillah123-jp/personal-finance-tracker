// SPA fallback worker — serves index.html for all non-asset routes
export default {
  async fetch(request) {
    const url = new URL(request.url);
    
    // Try to serve the static asset first
    const response = await fetch(request);
    
    // If 404 and not a file with extension, serve index.html (SPA fallback)
    if (response.status === 404 && !url.pathname.match(/\.\w+$/)) {
      const indexUrl = new URL('/index.html', request.url);
      return fetch(indexUrl);
    }
    
    return response;
  },
};
