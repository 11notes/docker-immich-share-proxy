import express from 'express'
import immich from './immich'
import render from './render'
import dayjs from 'dayjs'
import { AssetType } from './types'
import { decrypt } from './encrypt'
import { log, getSize, toString, addResponseHeaders } from './functions'

const app = express()
// Add the EJS view engine, to render the gallery page
app.set('view engine', 'ejs')
// For parsing the password unlock form
app.use(express.json())
// Serve static assets from the /public folder
app.use('/share/public', express.static('public', { setHeaders: addResponseHeaders }))

// An incoming request for a shared link
app.get('/share/:key', async (req, res) => {
  await immich.handleShareRequest({
    key: req.params.key,
    size: getSize(req)
  }, res)
})

// Receive an unlock request from the password page
app.post('/share/public/unlock', async (req, res) => {
  await immich.handleShareRequest({
    key: toString(req.body.key),
    password: toString(req.body.password)
  }, res)
})

// Output the buffer data for a photo or video
app.get('/share/:type(photo|video)/:key/:id', async (req, res) => {
  addResponseHeaders(res)
  // Check for valid key and ID
  if (immich.isKey(req.params.key) && immich.isId(req.params.id)) {
    let password
    // Validate the password payload, if one was provided
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
        }
      } catch (e) { }
    }
    // Check if the key is a valid share link
    const sharedLink = (await immich.getShareByKey(req.params.key, password))?.link
    if (sharedLink?.assets.length) {
      // Check that the requested asset exists in this share
      const asset = sharedLink.assets.find(x => x.id === req.params.id)
      if (asset) {
        asset.type = req.params.type === 'video' ? AssetType.video : AssetType.image
        render.assetBuffer(res, asset, getSize(req)).then()
        return
      }
    }
  }
  log('No asset found for ' + req.path)
  res.status(404).send()
})

// Healthcheck
app.get('/healthcheck', async (_req, res) => {
  if (await immich.accessible()) {
    res.sendStatus(200).end()
  } else {
    res.sendStatus(503).end()
  }
})

// Send a 404 for all other routes
app.get('*', (req, res) => {
  log('Invalid route ' + req.path)
  res.status(404).send()
})

app.listen(3000, () => {
  
})
