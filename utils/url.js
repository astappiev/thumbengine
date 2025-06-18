/**
 * @param {import('fastify').FastifyInstance} fastify encapsulated fastify instance
 * @param request {import('fastify').FastifyRequest}
 * @returns {string}
 */
export function getServerUrl(fastify, request) {
    if (fastify.config.SERVER_URL) {
        return fastify.config.SERVER_URL;
    }

    let port = '';
    if (!(request.protocol === 'https:' && request.port === 443) && !(request.protocol === 'http:' && request.port === 80) && request.port) {
        port = ':' + request.port;
    }
    return `${request.protocol}://${request.hostname}${port}/${request.url.substring(0, request.url.lastIndexOf('/'))}`
}
