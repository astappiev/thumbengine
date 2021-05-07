import config from "config";
import {Router} from "express";
import {body, validationResult} from "express-validator";
import {queueScreenshotJob} from "../src/queue.js";
import {takeScreenshot} from '../src/services/screenshot.js';
import {cleanDir, randGuid} from "../src/utils";

const router = Router();
const defaultOptions = config.get('screenshot');

/**
 * Creates a screenshot of given URL.
 */
router.post(
    '/',
    body('url').isURL().trim().notEmpty(),
    body('callbackUrl').isURL().trim().optional(),
    body('viewport').isObject().optional(),
    async function (req, res) {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(422).send({ errors: errors.array() })
        }

        const {url, callbackUrl, viewport} = req.body;
        const combinedOptions = {...defaultOptions, viewport};

        if (combinedOptions.callbackUrl) {
            const job = await queueScreenshotJob(url, callbackUrl, combinedOptions);
            res.send({status: 'queued', jobId: job.id});
        } else {
            const uuid = randGuid();

            try {
                const result = await takeScreenshot(uuid, {url, options: combinedOptions});
                res.download(result.filePath);
            } catch (e) {
                res.status(422).send({status: 'failed', error: e});
            } finally {
                await cleanDir(uuid);
            }
        }
    },
);

export default router;
