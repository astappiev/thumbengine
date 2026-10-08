import fs from "fs/promises";
import {download, safeExtname} from "../utils/file.js";
import thumbnailator from "thumbnailator";

/**
 * @param {import('fastify').FastifyInstance} fastify encapsulated fastify instance
 * @param {Job} job
 */
const thumbnailatorWorker = async (fastify, job) => {
    fastify.log.debug('processing job:', job.id);
    const { serverUrl, callbackUrl, downloadUrl, options } = job.data;
    await fastify.createDir(job.id);

    const downloadPath = fastify.resolveStaticFile(job.id, 'source');
    fastify.log.debug(`create temp download file: ${downloadPath}`);
    const {contentType, fileName} = await download(downloadUrl, downloadPath);

    // the processor is selected by the file extension, the url path is preferred over the name given by the server
    const ext = safeExtname(new URL(downloadUrl).pathname) || safeExtname(fileName);
    const sourcePath = downloadPath + ext;
    await fs.rename(downloadPath, sourcePath);

    const previewPath = fastify.resolveStaticFile(job.id, 'preview.' + options.format);
    fastify.log.debug(`create temp preview file: ${previewPath}`);
    await thumbnailator(sourcePath, previewPath, {
        ...options,
        // only rely on the content type if there is no extension, as servers often report a generic one
        mimeType: ext ? undefined : contentType,
        timeout: fastify.config.PROCESS_TIMEOUT,
    });

    return {
        serverUrl: serverUrl,
        callbackUrl: callbackUrl,
        thumbPath: previewPath,
    };
};

export default thumbnailatorWorker;
