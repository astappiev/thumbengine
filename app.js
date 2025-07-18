import {tmpdir} from "os";
import Fastify from 'fastify'
import FastifyEnv from "@fastify/env";
import { setGlobalDispatcher, EnvHttpProxyAgent } from 'undici'

import pluginDownload from "./plugins/download.js"
import pluginQueue from "./plugins/queue.js"

import routeRoot from "./routes/root.js"
import routeDownload from "./routes/download.js"
import routeFilePreview from "./routes/filepreview.js"
import routeScreenshot from "./routes/screenshot.js"

const envHttpProxyAgent = new EnvHttpProxyAgent()
setGlobalDispatcher(envHttpProxyAgent)

const schema = {
    type: 'object',
    properties: {
        PORT: {
            type: 'integer',
            default: 3000,
        },
        SERVER_URL: {
            type: 'string',
        },
        STORAGE_PATH: {
            type: 'string',
            default: tmpdir() + '/thumbengine',
        },
        CLEANUP_INTERVAL: {
            type: 'integer',
            default: 15 * 60 * 1000, // 15 minutes
        },
        CLEANUP_AFTER: {
            type: 'integer',
            default: 60 * 60 * 1000, // 1 hour
        },
        JOB_TIMEOUT: {
            type: 'integer',
            default: 30_000,
        },
        REDIS_HOST: {
            type: 'string',
            default: "127.0.0.1",
        },
        REDIS_PORT: {
            type: 'integer',
            default: 6379,
        },
        REDIS_AUTH: {
            type: 'string',
        }
    }
};

(async () => {
    const fastify = Fastify({
        logger: {
            "transport": {
                "target": "pino-pretty",
                "options": {
                    "translateTime": "HH:MM:ss Z",
                    "ignore": "pid,hostname"
                }
            }
        },
    });

    try {
        await fastify.register(FastifyEnv, {confKey: 'config', schema});

        fastify.register(pluginDownload, {
            root: fastify.config.STORAGE_PATH,
            cleanupAfter: fastify.config.CLEANUP_AFTER,
            cleanupInterval: fastify.config.CLEANUP_INTERVAL,
        });

        fastify.register(pluginQueue, {
            workersPath: 'workers/',
            connection: {
                host: fastify.config.REDIS_HOST,
                port: fastify.config.REDIS_PORT,
                // password: fastify.config.REDIS_PASSWORD,
            },
        });

        fastify.register(routeRoot);
        fastify.register(routeDownload, {prefix: '/download'});
        fastify.register(routeFilePreview, {prefix: '/filepreview'});
        fastify.register(routeScreenshot, {prefix: '/screenshot'});

        await fastify.listen({host: "0.0.0.0", port: fastify.config.PORT || 3000});
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
})();
