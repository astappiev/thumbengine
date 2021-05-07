import {Router} from "express";
import {query, param, validationResult} from "express-validator";
import {filePath, fileChecksum} from "../src/utils.js";

const router = Router();

/**
 * For a queued requests, the callback call will include URLs to download results.
 * This route handle the downloading of such files.
 *
 * The URL is signed by sha256 checksum of the file.
 */
router.get(
    '/:job/:file',
    param('job').isString().notEmpty(),
    param('file').isString().notEmpty(),
    query('sign').isLength(64),
    async function (req, res) {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(422).send({errors: errors.array()})
        }

        const jobId = req.params.job;
        const fileName = req.params.file;
        const sign = req.query.sign;

        try {
            const file = filePath(jobId, fileName);
            const checksum = await fileChecksum(file);

            if (checksum === sign) {
                res.download(file);
            } else {
                res.sendStatus(403);
            }
        } catch (err) {
            res.sendStatus(404);
        }
    },
);

export default router;
