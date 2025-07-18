import path from "path";
import fp from "fastify-plugin";
import { fetch } from 'undici'
import {Queue, QueueEvents, Worker, Job} from 'bullmq';
import fs from "fs/promises";

export default fp(async (fastify, opts) => {
    const queues = {};
    const workers = {};
    const queueEvents = {};

    const files = await fs.opendir(opts.workersPath);

    for await (const filePath of files) {
        const queueName = path.parse(filePath.name).name;

        const {
            default: worker,
            queueConfig,
            workerConfig,
            eventsConfig,
        } = await import(path.resolve(opts.workersPath, filePath.name));

        queues[queueName] = new Queue(queueName, {
            connection: opts.connection,
            ...(queueConfig && queueConfig),
        });
        fastify.log.info(`Created the queue ${queueName}`);

        if (!worker) {
            fastify.log.warn(`The queue ${queueName} does not have a worker function`);
        } else {
            workers[queueName] = new Worker(
                queueName,
                async (job) => await worker(fastify, job),
                {
                    connection: opts.connection,
                    ...(workerConfig && workerConfig),
                }
            );
            fastify.log.info(`Created a worker for the queue ${queueName}`);
        }

        queueEvents[queueName] = new QueueEvents(queueName, {
            connection: opts.connection,
            ...(eventsConfig && eventsConfig),
        });

        queueEvents[queueName].on('completed', async ({ jobId, returnvalue }) => {
            try {
                if (returnvalue && returnvalue.callbackUrl) {
                    await fetch(returnvalue.callbackUrl, {
                        method: 'PATCH',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            status: 'ok',
                            thumbnail: await fastify.resolveStaticUrl(returnvalue.serverUrl, returnvalue.thumbPath),
                        })
                    });
                }
            } catch (e) {
                fastify.log.error(`Failed callback request: ${e}`);
            }
        });

        queueEvents[queueName].on('failed', async ({ jobId, failedReason }) => {
            try {
                const job = await Job.fromId(queues[queueName], jobId);
                fastify.log.error(`failed job ${jobId}: ${failedReason}`);

                if (job.data && job.data.callbackUrl) {
                    await fetch(job.data.callbackUrl, {
                        method: 'PATCH',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            status: 'failed',
                            error: failedReason
                        })
                    });
                }
            } catch (e) {
                fastify.log.error(`Failed callback request: ${e}`);
            }
        });
    }

    fastify.decorate('queues', queues);
    fastify.decorate('workers', workers);
    fastify.decorate('queueEvents', queueEvents);
});
