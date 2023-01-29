import S from 'fluent-json-schema'

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
                        .prop('format', S.string().enum(Array.of("png", "jpeg", "webp")).default("png"))
                        .prop('quality', S.number().minimum(0).maximum(100))
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
            const jobOptions = {
                serverUrl: `${request.protocol}://${request.hostname}/${request.url.substring(0, request.url.lastIndexOf('/'))}`,
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
                    const result = await job.waitUntilFinished(fastify.queueEvents['puppeteer'], 10000);
                    return reply.sendFile(result.thumbPath);
                } catch (e) {
                    reply.code(422).send({error: e});
                }
            }
        }
    )
}
