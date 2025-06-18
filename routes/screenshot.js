import S from 'fluent-json-schema'
import {getServerUrl} from "../utils/url.js";

/**
 * @param {import('fastify').FastifyInstance} fastify encapsulated Fastify instance
 * @param {Object} opts plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
export default async function screenshot(fastify, opts) {
    fastify.post(
        '/',
        {
            schema: {
                body: S.object()
                    .prop('url', S.string().format('url').required())
                    .prop('callbackUrl', S.string().format('url'))
                    .prop('options', S.object().default({})
                        .prop('width', S.integer().minimum(10).maximum(10000).default(1920))
                        .prop('height', S.integer().minimum(10).maximum(10000).default(1080))
                        .prop('format', S.string().enum(Array.of("png", "jpg", "webp")).default("jpg"))
                        .prop('quality', S.number().minimum(0).maximum(100).default(90))
                        .prop('fullPage', S.boolean().default(false))
                    ),
                response: {
                    422: S.object()
                        .prop('status', S.string().default('failed'))
                        .prop('error', S.string()),
                }
            }
        },
        async function (request, reply) {
            const {url, callbackUrl, options} = request.body;
            if (options.format === 'jpg') options.format = 'jpeg'; // puppeteer uses 'jpeg' instead of 'jpg'

            const jobOptions = {
                serverUrl: getServerUrl(fastify, request),
                callbackUrl,
                url,
                browserOpts: {defaultViewport: {width: options.width, height: options.height}},
                screenshotOpts: {fullPage: options.fullPage, type: options.format, quality: options.quality}
            };

            const job = await fastify.queues['puppeteer'].add('screenshot', jobOptions);

            if (jobOptions.callbackUrl) {
                reply.code(202).send({status: 'queued'});
            } else {
                try {
                    const result = await job.waitUntilFinished(fastify.queueEvents['puppeteer'], fastify.config.JOB_TIMEOUT);
                    return reply.sendFile(result.thumbPath);
                } catch (e) {
                    reply.code(422).send({error: e});
                }
            }
        }
    )
}
