# HttpStream

This is a tiny prototype of making a `HttpStream`.

`HttpStream` is kinda like an oridinary stream you see everywhere. It lets you to load a file from remote server as binary data and load bytes on demand. Under the hood it gets the bytes via Http 206.

## Quick start

1. Host a http server in project root.
2. Launch your browser and navigate to the `index.html` then open the console to see what is happening.

The demo will show you how to detect the pixel size of two images under `public` folder without download them completely.
