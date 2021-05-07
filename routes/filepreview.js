import config from "config";
import {Router} from "express";
import {body, validationResult} from "express-validator";
import {queueFilepreviewJob} from "../src/queue.js";
import {createFilePreview} from '../src/services/filepreview.js';
import {cleanDir, randGuid} from "../src/utils";

const router = Router();
const defaultOptions = config.get('filepreview');

/**
 * Creates a preview of input file.
 */
router.post(
    '/',
    body('downloadUrl').isURL().trim().notEmpty(),
    body('callbackUrl').isURL().trim().optional(),
    body('options').isObject().optional(),
    async function (req, res) {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(422).send({errors: errors.array()})
        }

        const {downloadUrl, callbackUrl, options} = req.body;
        const combinedOptions = {...defaultOptions, ...options};

        if (combinedOptions.callbackUrl) {
            const job = await queueFilepreviewJob(downloadUrl, callbackUrl, combinedOptions);
            res.send({status: 'queued', jobId: job.id});
        } else {
            const uuid = randGuid();

            try {
                const result = await createFilePreview(uuid, {downloadUrl, options: combinedOptions});
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
