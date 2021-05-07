import path from "path";
import os from "os";
import crypto from "crypto";
import config from "config";
import fsPromises from "fs/promises";
import {createReadStream} from "fs";

const appConfig = config.get('app');

const serverUrl = appConfig.serverUrl;
const storagePath = appConfig.storagePath || os.tmpdir();

export function randGuid() {
    return Math.random().toString(36).substring(2, 15);
}

export async function createDir(jobId) {
    const dir = path.resolve(storagePath, jobId);

    try {
        await fsPromises.access(dir);
        await fsPromises.rmdir(dir, {recursive: true});
        await fsPromises.mkdir(dir);
    } catch {
        await fsPromises.mkdir(dir);
    }
}

export async function cleanDir(jobId) {
    const dir = path.resolve(storagePath, jobId);

    try {
        await fsPromises.rmdir(dir, {recursive: true});
    } catch {
        // directory didn't exist
    }
}

export function filePath(jobId, filename) {
    return path.resolve(storagePath, jobId, filename);
}

export async function fileUrl(jobId, filename) {
    const filePath = path.resolve(storagePath, jobId, filename);
    const checksum = await fileChecksum(filePath);
    return serverUrl + '/download/' + jobId + '/' + filename + '?sign=' + checksum;
}

export async function filePathToUrl(filePath) {
    const parts = filePath.split(/[\\/]/);
    const filename = parts.pop();
    const jobId = parts.pop();
    const checksum = await fileChecksum(filePath);
    return serverUrl + '/download/' + jobId + '/' + filename + '?sign=' + checksum;
}

export async function fileChecksum(filename) {
    const stat = await fsPromises.stat(filename);
    if (!stat.isFile()) throw new Error('File not found');

    const hash = crypto.createHash('sha256');
    hash.setEncoding('hex');

    return new Promise((resolve, reject) => {
        const fileStream = createReadStream(filename);
        fileStream.pipe(hash, {end: false})
        fileStream.on('error', reject);
        fileStream.on('end', function () {
            hash.end()
            resolve(hash.read());
        });
    });
}
