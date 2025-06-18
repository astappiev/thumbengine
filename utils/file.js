import crypto from "crypto";
import fsPromises from "fs/promises";
import {createReadStream, createWriteStream} from "fs";

export async function fileChecksum(filePath) {
    const stat = await fsPromises.stat(filePath);
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

    const fileStream = createWriteStream(storePath);
    await new Promise((resolve, reject) => {
        res.body.pipe(fileStream);
        res.body.on("error", reject);
        fileStream.on('error', reject);
        fileStream.on("finish", resolve);
    });
}
