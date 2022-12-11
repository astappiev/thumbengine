import path from "path";
import {download} from "../utils/file.js";
import thumbnailator from "thumbnailator";

/**
 * @param {import('fastify').FastifyInstance} fastify encapsulated fastify instance
 * @param {Job} job
 */
const thumbnailatorWorker = async (fastify, job) => {
    fastify.log.debug('processing job:', job.id);
    const { serverUrl, callbackUrl, downloadUrl, options } = job.data;
    await fastify.createDir(job.id);

    const sourcePath = fastify.resolveStaticFile(job.id, 'source' + path.extname(downloadUrl));
    fastify.log.debug(`create temp download file: ${sourcePath}`);
    await download(downloadUrl, sourcePath);

    const previewPath = fastify.resolveStaticFile(job.id, 'preview.' + options.format);
    fastify.log.debug(`create temp preview file: ${previewPath}`);
    await thumbnailator(sourcePath, previewPath, options);

    return {
        serverUrl: serverUrl,
        callbackUrl: callbackUrl,
        thumbPath: previewPath,
    };
};

export default thumbnailatorWorker;
