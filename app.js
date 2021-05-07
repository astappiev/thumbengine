import express from "express";
import config from "config";
import path from "path";
import morgan from "morgan";
import rfs from "rotating-file-stream";

import indexRouter from "./routes/index.js";
import downloadRouter from "./routes/download.js";
import filepreviewRouter from "./routes/filepreview.js";
import screenshotRouter from "./routes/screenshot.js";

const appConfig = config.get('app');
const app = express();

// create a rotating write stream
const accessLogStream = rfs.createStream('access.log', {
    interval: '1d', // rotate daily
    path: path.join('./', 'log')
});

// setup the logger
app.use(morgan('dev', { stream: accessLogStream }));
app.use(express.json());

app.use('/', indexRouter);
app.use('/download', downloadRouter);
app.use('/filepreview', filepreviewRouter);
app.use('/screenshot', screenshotRouter);

const port = appConfig.port || 3000;
app.listen(port, () => {
    console.log(`Filepreview Service app listening at http://localhost:${port}`)
});
