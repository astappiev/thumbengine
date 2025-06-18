import send from "send";
import path from "path";
import fp from "fastify-plugin";
import {PassThrough} from "stream";
import contentDisposition from "content-disposition";
import {fileChecksum} from "../utils/file.js";
import fs from "fs/promises";

export default fp(async (fastify, opts) => {
    const setHeaders = opts.setHeaders

    if (setHeaders !== undefined && typeof setHeaders !== 'function') {
        throw new TypeError('The `setHeaders` option must be a function')
    }

    const cleanupAfter = opts.cleanupAfter || 60 * 60 * 1000; // fallback to 1 hour
    const cleanupInterval = opts.cleanupInterval || 60 * 60 * 1000; // fallback to 1 hour
    const sendOptions = {
        root: opts.root,
        acceptRanges: opts.acceptRanges,
        cacheControl: opts.cacheControl,
        dotfiles: opts.dotfiles,
        etag: opts.etag,
        extensions: opts.extensions,
        immutable: opts.immutable,
        lastModified: opts.lastModified,
        maxAge: opts.maxAge
    }

    await fs.mkdir(sendOptions.root, {recursive: true});

    function pumpSendToReply(request, reply, pathname, pumpOptions = {}) {
        const options = Object.assign({}, sendOptions, pumpOptions)

        const stream = send(request.raw, pathname, options);
        let resolvedFilename;
        stream.on('file', function (file) {
            resolvedFilename = file;
        })

        const wrap = new PassThrough({
            flush(cb) {
                this.finished = true
                if (reply.raw.statusCode === 304) {
                    reply.send('')
                }
                cb();
            }
        })

        wrap.getHeader = reply.getHeader.bind(reply);
        wrap.setHeader = reply.header.bind(reply);
        wrap.removeHeader = () => {};
        wrap.finished = false;

        Object.defineProperty(wrap, 'filename', {
            get() {
                return resolvedFilename;
            }
        })
        Object.defineProperty(wrap, 'statusCode', {
            get() {
                return reply.raw.statusCode;
            },
            set(code) {
                reply.code(code);
            }
        })

        if (request.method === 'HEAD') {
            wrap.on('finish', reply.send.bind(reply));
        } else {
            wrap.on('pipe', function () {
                reply.send(wrap);
            });
        }

        if (setHeaders !== undefined) {
            stream.on('headers', setHeaders);
        }

        stream.on('error', function (err) {
            if (err.code === 'ENOENT' || err.status === 404) {
                return reply.callNotFound();
            }

            reply.send(err);
        });

        // we cannot use pump, because send error
        // handling is not compatible
        stream.pipe(wrap);
    }

    fastify.decorateReply('sendFile', function (filePath, options) {
        if (filePath.startsWith(opts.root)) {
            filePath = filePath.substring(opts.root.length + 1);
        }

        pumpSendToReply(this.request, this, filePath, options);
        return this;
    });

    fastify.decorateReply('download', function (filePath, fileName, options = {}) {
        if (filePath.startsWith(opts.root)) {
            filePath = filePath.substring(opts.root.length + 1);
        }

        options = typeof fileName === 'object' ? fileName : options;
        fileName = typeof fileName === 'string' ? fileName : filePath;

        // Set content disposition header
        this.header('Content-Disposition', contentDisposition(fileName));
        pumpSendToReply(this.request, this, filePath, options);
        return this;
    });

    fastify.decorate('createDir', async function (jobId) {
        const folder = path.resolve(opts.root, jobId);
        try {
            await fs.access(folder); // throws if folder doesn't exist
            await fs.rm(folder, {recursive: true});
            await fs.mkdir(folder);
        } catch {
            await fs.mkdir(folder);
        }
    });

    fastify.decorate('resolveStaticFile', function (jobId, filename) {
        return path.resolve(opts.root, jobId, filename);
    });

    fastify.decorate('resolveStaticUrl', async function (serverUrl, filePath) {
        const checksum = await fileChecksum(filePath);
        return serverUrl + '/download/' + filePath.substring(opts.root.length + 1) + '?sign=' + checksum;
    });

    async function cleanup() {
        const cutoff = Date.now() - cleanupAfter;
        try {
            const child = await fs.readdir(opts.root);
            for (const dir of child) {
                const dirPath = path.join(opts.root, dir);
                try {
                    const stats = await fs.stat(dirPath);
                    if (stats.mtime.getTime() < cutoff) {
                        await fs.rm(dirPath, {recursive: true, force: true});
                        fastify.log.info(`Removed directory: ${dirPath}`);
                    }
                } catch (err) {
                    fastify.log.warn(`Could not process ${dirPath} for cleanup: ${err.message}`);
                }
            }
        } catch (err) {
            fastify.log.error(`Error during temp file cleanup: ${err.message}`);
        }
    }

    // Run cleanup on startup and on an interval
    cleanup();
    const cleanupIntervalId = setInterval(cleanup, cleanupInterval);

    fastify.addHook('onClose', (instance, done) => {
        clearInterval(cleanupIntervalId);
        done();
    });
})