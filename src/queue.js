import Queue from 'bull';
import config from 'config';
import fetch from 'node-fetch';
import {createFilePreview} from './services/filepreview.js';
import {takeScreenshot} from './services/screenshot.js';
import {filePathToUrl} from "./utils";

const appConfig = config.get('app');

const jobsQueue = new Queue('jobs', {redis: appConfig.redis});

jobsQueue.process('filepreview', async function (job) {
    return processJob(job, createFilePreview);
});

jobsQueue.process('screenshot', async function (job) {
    return processJob(job, takeScreenshot);
});

/**
 * @param {Job} job
 * @param {function} fn
 * @returns {Job}
 */
async function processJob(job, fn) {
    console.debug('processing job:', job.id);
    const callbackUrl = job.data.callbackUrl;

    try {
        const results = await fn(job.id, job.data);
        console.info('completed job:', job.id, results);

        results.downloadUrl = filePathToUrl(results.filePath);
        delete results.filePath;

        return fetch(callbackUrl, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({status: 'ok', data: results})
        }).catch(e => console.error(e));
    } catch (e) {
        console.error('failed job:', job.id, e);

        return fetch(callbackUrl, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({status: 'failed', error: e})
        }).catch(e => console.error(e));
    }
}

/**
 * @param {string} jobType
 * @param {object} args
 * @returns {Job}
 */
async function createJob(jobType, args) {
    console.debug('adding job:', args);

    return jobsQueue.add(jobType, args, {attempts: 2});
}

/**
 * @param {string} url
 * @param {string} [callbackUrl]
 * @param {object} options
 * @returns {Job}
 */
export async function queueScreenshotJob(url, callbackUrl, options) {
    return createJob('screenshot', {url, callbackUrl, options});
}

/**
 * @param {string} downloadUrl
 * @param {string} [callbackUrl]
 * @param {object} options
 * @returns {Job}
 */
export async function queueFilepreviewJob(downloadUrl, callbackUrl, options) {
    return createJob('filepreview', {downloadUrl, callbackUrl, options});
}
