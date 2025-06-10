"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class HttpStream {
    readAsync(position, length) {
        return fetch(this.url, {
            method: 'GET',
            headers: {
                Range: `bytes=${position}-${position + length - 1}`
            },
            keepalive: true
        }).then(item => item.arrayBuffer());
    }
    getLength() {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield fetch(this.url, {
                method: 'HEAD'
            });
            const headers = response.headers;
            const length = headers.get('Content-Length');
            if (length) {
                return parseInt(length);
            }
            return 0;
        });
    }
    constructor(url) {
        this.url = '';
        this.url = url;
    }
}
const sequenceEqual = (a1, a2) => {
    if (a1.length !== a2.length) {
        return false;
    }
    for (let i = 0; i < a1.length; i++) {
        const b1 = a1[i];
        const b2 = a2[i];
        if (b1 !== b2) {
            return false;
        }
    }
    return true;
};
const getPngPixelSize = (fileBytes) => {
    const PNG_HEADER = [137, 80, 78, 71, 13, 10, 26, 10];
    const isEqual = sequenceEqual(PNG_HEADER, fileBytes.slice(0, PNG_HEADER.length));
    if (!isEqual) {
        throw new Error('Not a png file');
    }
    const dataView = new DataView(fileBytes.buffer);
    const width = dataView.getInt16(18, false);
    const height = dataView.getInt16(22, false);
    return [width, height];
};
const getJpgPixelSize = (fileStream) => __awaiter(void 0, void 0, void 0, function* () {
    const JPG_HEADER_1 = [255, 216, 255, 224];
    const JPG_HEADER_2 = [255, 216, 255, 225];
    const headerBytes = new Uint8Array(yield fileStream.readAsync(0, 4));
    const isEqual = sequenceEqual(JPG_HEADER_1, headerBytes) ||
        sequenceEqual(JPG_HEADER_2, headerBytes);
    if (!isEqual) {
        throw new Error('Not a jpg file');
    }
    let basePosition = 4;
    const fileBytes = yield fileStream.getLength();
    while (basePosition < fileBytes) {
        const sectionLength = new DataView(yield fileStream.readAsync(basePosition, 2)).getUint16(0);
        const next = new DataView(yield fileStream.readAsync(basePosition + sectionLength + 1, 1)).getUint8(0);
        if (next === 0xC0 || next === 0xC1 || next === 0xC2) {
            const width = new DataView(yield fileStream.readAsync(basePosition + sectionLength + 5, 2)).getUint16(0);
            const height = new DataView(yield fileStream.readAsync(basePosition + sectionLength + 7, 2)).getUint16(0);
            return [width, height];
        }
        basePosition = basePosition + sectionLength + 2;
    }
    return [-1, -1];
});
const detectPng = (pngUrl) => __awaiter(void 0, void 0, void 0, function* () {
    const stream = new HttpStream(pngUrl);
    const pngBytes = yield stream.readAsync(0, 30);
    const [width, height] = getPngPixelSize(new Uint8Array(pngBytes));
    console.log(`Png Image: ${pngUrl}`);
    console.log(`Pixel size: ${width}x${height}`);
    const totalLength = yield stream.getLength();
    console.log('Total file bytes:', totalLength);
    console.log('');
});
const detectJpg = (jpgUrl) => __awaiter(void 0, void 0, void 0, function* () {
    const stream = new HttpStream(jpgUrl);
    const [width, height] = yield getJpgPixelSize(stream);
    console.log(`Jpg Image: ${jpgUrl}`);
    console.log(`Pixel size: ${width}x${height}`);
    const totalLength = yield stream.getLength();
    console.log('Total file bytes:', totalLength);
    console.log('');
});
// Testing code below.
// Host an HTTP server and make sure '/public' is accessible.
// We will read a PNG image and a JPEG image and detect their pixel sizes without downloading the entire files.
// For a JPEG/PNG file, downloading the first 30 bytes is sufficient to detect the pixel size.
Promise.all([
    detectPng('/public/yuki.png'),
    detectJpg('/public/shubham-dhage-unsplash.jpg')
]);
