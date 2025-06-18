/**
 * @param {import('fastify').FastifyInstance} fastify encapsulated fastify instance
 * @param request {import('fastify').FastifyRequest}
 * @returns {string}
 */
export function getServerUrl(fastify, request) {
    let serverUrl = request.server.listeningOrigin;
    if (fastify.config && fastify.config.SERVER_URL) {
        serverUrl = fastify.config.SERVER_URL;
    } else {
        let port = '';
        if (!(request.protocol === 'https:' && request.port === 443) && !(request.protocol === 'http:' && request.port === 80) && request.port) {
            port = ':' + request.port;
        }
        serverUrl = `${request.protocol}://${request.hostname}${port}/${request.url.substring(0, request.url.lastIndexOf('/'))}`
    }

    if (serverUrl.endsWith('/')) {
        serverUrl = serverUrl.slice(0, -1);
    }

    return serverUrl;
}
