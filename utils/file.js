import crypto from "crypto";
import fs from "fs/promises";
import {createReadStream} from "fs";
import { fetch } from 'undici'

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

export async function download(remoteUrl, storePath) {
    const res = await fetch(remoteUrl);
    return await fs.writeFile(storePath, res.body);
}
