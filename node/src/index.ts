import express from 'express'
import immich from './immich'
import render from './render'
import dayjs from 'dayjs'
import { AssetType, ImageSize } from './types'
import { decrypt } from './encrypt'
import { log, toString, addResponseHeaders } from './functions'

require('dotenv').config()

const app = express()
// Add the EJS view engine, to render the gallery page
app.set('view engine', 'ejs')
// For parsing the password unlock form
app.use(express.json())
// Serve static assets from the /public folder
app.use('/share/public', express.static('public', { setHeaders: addResponseHeaders }))

/*
 * [ROUTE] This is the main URL that someone would visit if they are opening a shared link
 */
app.get('/share/:key', async (req, res) => {
  await immich.handleShareRequest({
    key: req.params.key
  }, res)
})

/*
 * [ROUTE] Receive an unlock request from the password page
 */
app.post('/share/unlock', async (req, res) => {
  await immich.handleShareRequest({
    key: toString(req.body.key),
    password: toString(req.body.password)
  }, res)
})

/*
 * [ROUTE] Download all pictures as zip
 */
app.post('/share/download', async (req, res) => {
  // Add the headers configured in config.json (most likely `cache-control`)
  addResponseHeaders(res)
})

/*
 * [ROUTE] This is the direct link to a photo or video asset
 */
app.get('/share/:type(photo|video)/:key/:id/:size?', async (req, res) => {
  // Add the headers configured in config.json (most likely `cache-control`)
  addResponseHeaders(res)

  // Check for valid key and ID
  if (!immich.isKey(req.params.key) || !immich.isId(req.params.id)) {
    log('Invalid key or ID for ' + req.path)
    res.status(404).send()
    return
  }

  // Validate the size parameter
  if (req.params.size && !Object.values(ImageSize).includes(req.params.size as ImageSize)) {
    log('Invalid size parameter ' + req.path)
    res.status(404).send()
    return
  }

  // Validate the password payload, if one was provided
  let password
  if (req.query?.cr && req.query?.iv) {
    try {
      const payload = JSON.parse(decrypt({
        iv: toString(req.query.iv),
        cr: toString(req.query.cr)
      }))
      if (payload?.expires && dayjs(payload.expires) > dayjs()) {
        password = payload.password
      } else {
        log(`Attempted to load assets from ${req.params.key} with an expired decryption token`)
        // Send 404 rather than 401 so as not to provide information to an attacker that there is "something" at this path
        res.status(404).send()
        return
      }
    } catch (e) { }
  }

  // Fetch the shared link information from Immich, so we can check to make sure that the requested asset
  // is allowed by this shared link.
  const sharedLink = (await immich.getShareByKey(req.params.key, password))?.link
  const request = {
    key: req.params.key,
    range: req.headers.range || ''
  }
  if (sharedLink?.assets.length) {
    // Check that the requested asset exists in this share
    const asset = sharedLink.assets.find(x => x.id === req.params.id)
    if (asset) {
      asset.type = req.params.type === 'video' ? AssetType.video : AssetType.image
      render.assetBuffer(request, res, asset, req.params.size).then()
    }
  } else {
    log('No asset found for ' + req.path)
    res.status(404).send()
  }
})

/*
 * [ROUTE] Healthcheck
 */
app.get('/healthcheck', async (_req, res) => {
  if (await immich.accessible()) {
    res.sendStatus(200).end()
  } else {
    res.sendStatus(503).end()
  }
})

/*
 * Send a 404 for all other routes
 */
app.get('*', (req, res) => {
  log('Invalid route ' + req.path)
  res.sendStatus(404).send()
})

// Start the ExpressJS server
app.listen(3000, () => {
  console.log(dayjs().format() + ' Server started')
})