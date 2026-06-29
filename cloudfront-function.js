function handler(event) {
    var request = event.request;
    var uri = request.uri;

    // Pass through requests that have a file extension (static assets)
    if (uri.match(/\.[a-zA-Z0-9]+$/)) {
        return request;
    }

    // Rewrite all other paths to index.html for React Router to handle
    request.uri = '/index.html';
    return request;
}
