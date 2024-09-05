# HttpStream

This is a small prototype of `HttpStream`.

HttpStream is a standard-stream-like object. It allows you to load bytes from a remote server on demand. Under the hood it retrieves the bytes via Http 206.

## Quick start

 - Host an HTTP server on the project root directory.
 - Launch your browser and navigate to index.html, then open develop tools to see what is going on.

The demo will show you how to detect pixel size of two images under the `public` folder without downloading them completely.
