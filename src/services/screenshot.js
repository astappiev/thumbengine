import puppeteer from "puppeteer";
import fsPromises from "fs/promises";
import {createDir, filePath} from "../utils.js";

/**
 * @param {string} jobId
 * @param {object} data
 * @param {string} data.url
 * @param {object} data.options
 * @returns {Promise<{filePath: string}>}
 */
export async function takeScreenshot(jobId, data) {
    const {url, options} = data;

    const browser = await puppeteer.launch({defaultViewport: options.viewport});
    const page = await browser.newPage();
    await page.goto(url);

    delete options.viewport;
    const buffer = await page.screenshot({type: 'png', fullPage: true, ...options});
    await browser.close();

    await createDir(jobId);
    const screenshotPath = filePath(jobId, 'screenshot.png');
    await fsPromises.writeFile(screenshotPath, buffer);
    return {filePath: screenshotPath};
}
