import crypto from "crypto";
import path from "path";
import fs from "fs/promises";
import {createReadStream} from "fs";
import { fetch } from 'undici'
import contentDisposition from "content-disposition";

export async function fileChecksum(filePath) {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) throw new Error('File not found');

    const hash = crypto.createHash('sha256');
    hash.setEncoding('hex');

    return new Promise((resolve, reject) => {
        const fileStream = createReadStream(filePath);
        fileStream.pipe(hash, {end: false})
        fileStream.on('error', reject);
        fileStream.on('end', function () {
            hash.end()
            resolve(hash.read());
        });
    });
}

/**
 * @param {string} remoteUrl
 * @param {string} storePath
 * @returns {Promise<{contentType: ?string, fileName: ?string}>} the file details reported by the server
 */
export async function download(remoteUrl, storePath) {
    const res = await fetch(remoteUrl);
    if (!res.ok) {
        throw new Error(`Unable to download the file, the server responded with ${res.status} ${res.statusText}`);
    }

    await fs.writeFile(storePath, res.body);

    let fileName = null;
    try {
        const header = res.headers.get('content-disposition');
        fileName = header ? contentDisposition.parse(header).parameters.filename || null : null;
    } catch (e) {
        // ignore malformed header
    }

    return {contentType: res.headers.get('content-type'), fileName};
}

/**
 * @param {?string} fileName a file name or a path
 * @returns {string} the extension including the dot, or an empty string if there is no (valid) extension
 */
export function safeExtname(fileName) {
    const ext = path.extname(fileName || '');
    return /^\.[a-z0-9]{1,10}$/i.test(ext) ? ext : '';
}
