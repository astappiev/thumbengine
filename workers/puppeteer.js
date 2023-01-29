import puppeteer from "puppeteer";

/**
 * @param {import('fastify').FastifyInstance} fastify encapsulated fastify instance
 * @param {Job} job
 */
const puppeteerWorker = async (fastify, job) => {
    fastify.log.debug('processing job:', job.id);
    let { serverUrl, callbackUrl, url, browserOpts, screenshotOpts } = job.data;
    await fastify.createDir(job.id);

    // remove a toolbar if WabArchive url requested
    if (url.startsWith('https://web.archive.org/web/')) {
        const url_parts = url.split('/');
        if (url_parts.length > 5 && !url_parts[4].endsWith('_')) {
            url = 'https://web.archive.org/web/' + url_parts[4] + 'if_/' + url_parts.slice(5).join('/');
        }
    }

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
