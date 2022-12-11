import S from "fluent-json-schema";
import {fileChecksum} from "../utils/file.js";

/**
 * For a queued requests, the callback call will include URLs to download results.
 * This route handle the downloading of such files.
 *
 * The URL is signed by sha256 checksum of the file.
 *
 * @param {import('fastify').FastifyInstance} fastify encapsulated fastify instance
 * @param {Object} opts plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
export default async function download(fastify, opts) {
    fastify.get(
        '/:jobId/:fileName',
        {
            schema: {
                params: S.object()
                    .prop('jobId', S.string().required())
                    .prop('fileName', S.string().required()),
                query: S.object()
                    .prop('sign', S.string().minLength(64).maxLength(64)),
                response: {
                    422: S.object()
                        .prop('status', S.string().default('failed'))
                        .prop('error', S.string()),
                }
            }
        },
        async function (request, reply) {
            const {jobId, fileName} = request.params;
            const {sign} = request.query;

            try {
                const file = fastify.resolveStaticFile(jobId, fileName);
                const checksum = await fileChecksum(file);

                if (checksum === sign) {
                    return reply.sendFile(file);
                } else {
                    reply.code(403).send({status: 'failed'});
                }
            } catch (err) {
                reply.code(404).send({status: 'failed'});
            }
        }
    )
}
