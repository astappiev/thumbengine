/**
 * @param request {import('fastify').FastifyRequest}
 * @returns {string}
 */
export async function getServerUrl(request) {
    let port = '';
    if (!(request.protocol === 'https:' && request.port === 443) && !(request.protocol === 'http:' && request.port === 80)) {
        port = ':' + request.port;
    }
    return `${request.protocol}://${request.hostname}${port}/${request.url.substring(0, request.url.lastIndexOf('/'))}`
}
