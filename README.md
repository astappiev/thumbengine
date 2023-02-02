# ThumbEngine

The ThumbEngine service creates preview images from downloadable files by using the [thumbnailator](https://www.npmjs.com/package/thumbnailator) generator.

## Usage

The thumbnailator service provides an http(s) endpoint to process incoming requests:

```
POST /filepreview
{
    "downloadUrl": "https://example.com/static/powerpoint1.ppt",
    "callbackUrl": "https://example.com/callback",
    "options": {
        "width": 200
        "format": "webp"
    }
}
```

The service downloads the file from `downloadUrl`, creates the preview image and reports the success/error to the `callbackUrl`.

The payload has to be valid json, whereby the `downloadUrl` is mandatory and the rest is optional.

Valid option values are:
-   `width`, `height`: integer (pixel). The target image width and/or height
-   `scale`: integer (percent). An alternative to `width` and `height`, the image will be scaled to the given percentage
-   `format`: [png, jpeg (default), webp]
-   `quality`: 0-100 (used for jpeg, default 90)
-   `crop`: boolean, default `false` is whether to crop the image to the given dimensions
-   `ignoreAspect`: boolean, default `false` is whether to keep the aspect ratio of the original document
-   `oversize`: boolean, default `false` is whether to use the given dimensions as minimum values
-   `shrink`: boolean, default `false` is whether to shrink the image if it is larger than the target size
-   `enlarge`: boolean, default `false` is whether to enlarge the image if it is smaller than the target size
-   `thumbnail`: boolean, default `false` is whether to use the fastest possible way to create the thumbnail
-   `background`: default `#ffffff` (white) is the background color of the image if transparent

The `callbackUrl` is optional, if not specified, the service will wait for the result and send it to response immediately.

If `callbackUrl` given, the service will return a `202 Accepted` response and notify the given url when completed.

The success report to the `callbackUrl` is a request:

```
PATCH <callbackUrl>
 {'thumbnail': 'https://example.com/powerpoint1.png?sign=sha256'}
```

The error report to the `callbackUrl` is a request:

```
PATCH <callbackUrl>
 {'error': 'An error occured: <errormessage>'}
```

### Screenshot

The screenshot endpoint is similar to /filepreview, but is used to create a screenshot of a given url:

```
POST /screenshot
{
    "url": "https://example.com/",
    "callbackUrl": "https://example.com/callback",
    "options": {
        "width": 200
        "format": "webp"
    }
}
```

Valid option values are:
-   `width`, `height`: integer (pixel). The default `width` is 1920, the height is 1080
-   `format`: [png, jpeg (default), webp]
-   `quality`: 0-100 (used for jpeg, default 90)
-   `fullPage`: boolean, default `false` is whether to take a screenshot of the full scrollable page


## File types

The supported file-types are: [document-formats](https://www.npmjs.com/package/thumbnailator#document-formats) (only the usual office types are tested)

The file-type detection is based on the file's extension. The according file-type / extension mapping is taken from the [mime package](https://github.com/broofa/mime).

## Requirements

Since the service uses [BullMQ](https://docs.bullmq.io/) job queue, a redis server is necessary. For this, the `REDIS_HOST` has to be provided as environment variables at startup.

## Docker

A docker image is created based on the `node:lts-alpine` Alpine NodeJS image.
In development mode, `docker-compose` is used to get both executed and connected. (See more details in `docker-compose.yml`)
In production mode, however, an existing `docker-compose.yml` file can already be used. This file must be adjusted accordingly. The necessary environment variables are `USERNAME`, `PASSWORD` and the `REDIS_HOST` (and `REDIS_AUTH` if needed).
