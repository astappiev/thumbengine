/**
 * @param {import('fastify').FastifyInstance} fastify encapsulated fastify instance
 * @param {Object} opts plugin options, refer to https://www.fastify.io/docs/latest/Reference/Plugins/#plugin-options
 */
export default async function root(fastify, opts) {
    fastify.get('/', async function (request, reply) {
        return {message: 'Hello World!'}
    });

    fastify.get('/health', async function (request, reply) {
        return {message: 'ok'}
    });
}
