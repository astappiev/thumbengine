import path from "path";
import fs from "fs";
import fetch from "node-fetch";
import filepreview from "@learnweb/filepreview";
import {createDir, filePath} from "../utils";
import fsPromises from "fs/promises";

/**
 * @param {string} jobId
 * @param {object} data
 * @param {string} data.downloadUrl
 * @param {string} [data.callbackUrl]
 * @param {object} data.options
 * @returns {Promise<{filePath: string}>}
 */
export async function createFilePreview(jobId, data) {
    await createDir(jobId);

    const screenshotPath = filePath(jobId, 'screenshot.png');
    await fsPromises.writeFile(screenshotPath, buffer);

    const sourcePath = await downloadFile(jobId, data.options, data.downloadUrl);

    const previewPath = filePath(jobId, 'preview.' + options.outputFormat);
    console.debug('create temp preview file: ' + previewPath);

    await filepreview(sourcePath, previewPath, options);

    return {filePath: previewPath};
}

export async function downloadFile(jobId, options, downloadUrl) {
    const ext = path.extname(downloadUrl);

    const sourcePath = filePath(jobId, 'source.' + ext);
    console.debug('create temp download file: ' + sourcePath);

    const res = await fetch(downloadUrl);

    const fileStream = fs.createWriteStream(sourcePath);
    await new Promise((resolve, reject) => {
        res.body.pipe(fileStream);
        res.body.on("error", reject);
        fileStream.on("finish", resolve);
    });
}
