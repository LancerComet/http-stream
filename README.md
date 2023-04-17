# HttpStream

This is a small prototype for creating an `HttpStream`.

HttpStream is similar to a standard stream which is commonly used. It allows you to load a file from a remote server as binary data and load bytes on demand. Under the hood, it retrieves the bytes via Http 206.

## Quick start

 - Host an HTTP server in the project root.
 - Launch your browser and navigate to index.html, then open the console to see what is going on.

The demo will show you how to detect the pixel size of two images under the `public` folder without downloading them completely.
