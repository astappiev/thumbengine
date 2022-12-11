import puppeteer from "puppeteer";

/**
 * @param {import('fastify').FastifyInstance} fastify encapsulated fastify instance
 * @param {Job} job
 */
const puppeteerWorker = async (fastify, job) => {
    fastify.log.debug('processing job:', job.id);
    const { serverUrl, callbackUrl, url, browserOpts, screenshotOpts } = job.data;
    await fastify.createDir(job.id);

    const browser = await puppeteer.launch(browserOpts);
    try {
        const page = await browser.newPage();
        await page.goto(url);

        const path = fastify.resolveStaticFile(job.id, 'preview.' + screenshotOpts.type);
        await page.screenshot({...screenshotOpts, path});
        return {
            serverUrl: serverUrl,
            callbackUrl: callbackUrl,
            thumbPath: path,
        }
    } catch (e) {
        throw new Error('Unable to take screenshot ' + e)
    } finally {
        await browser.close();
    }
};

export default puppeteerWorker;
