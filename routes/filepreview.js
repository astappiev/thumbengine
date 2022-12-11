import S from "fluent-json-schema";

/**
 * @param {import('fastify').FastifyInstance} fastify encapsulated fastify instance
 * @param {Object} opts plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
export default async function filepreview(fastify, opts) {
    fastify.post(
        '/',
        {
            schema: {
                body: S.object()
                    .prop('downloadUrl', S.string().format('url').required())
                    .prop('callbackUrl', S.string().format('url'))
                    .prop('options', S.object().default({})
                        .prop('width', S.integer().minimum(10).maximum(10000).default(640))
                        .prop('height', S.integer().minimum(10).maximum(10000))
                        .prop('format', S.string().enum(Array.of("png", "jpeg", "webp")).default("png"))
                        .prop('crop', S.boolean().default(false))
                        .prop('keepAspect', S.boolean().default(true))
                        .prop('thumbnail', S.boolean().default(false))
                        .prop('quality', S.number().minimum(0).maximum(100))
                        .prop('density', S.number().minimum(0).maximum(1000))
                        .prop('background', S.string().default("#ffffff"))
                    ),
                response: {
                    422: S.object()
                        .prop('status', S.string().default('failed'))
                        .prop('error', S.string()),
                }
            }
        },
        async function (request, reply) {
            const {downloadUrl, callbackUrl, options} = request.body;
            const jobOptions = {
                serverUrl: `${request.protocol}://${request.hostname}/${request.url.substring(0, request.url.lastIndexOf('/'))}`,
                callbackUrl,
                downloadUrl,
                options
            };

            const job = await fastify.queues['thumbnailator'].add('filepreview', jobOptions);

            if (jobOptions.callbackUrl) {
                reply.code(202).send({status: 'queued'});
            } else {
                try {
                    const result = await job.waitUntilFinished(fastify.queueEvents['thumbnailator'], 5000);
                    return reply.sendFile(result.thumbPath);
                } catch (e) {
                    reply.code(422).send({error: e});
                }
            }
        }
    )
}
