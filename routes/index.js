import express from "express";

const router = express.Router();

/**
 * Empty route, can be used to check a status.
 */
router.get('/', function(req, res) {
  res.send({status: 'ok'});
});

export default router;
