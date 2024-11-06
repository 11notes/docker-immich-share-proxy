import { Asset, AssetType, ImageSize, IncomingShareRequest, SharedLink, SharedLinkResult } from './types'
import dayjs from 'dayjs'
import { addResponseHeaders, getConfigOption, log } from './functions'
import render from './render'
import { Response } from 'express-serve-static-core'
import { encrypt } from './encrypt'

class Immich {
  /**
   * Make a request to Immich API. We're not using the SDK to limit
   * the possible attack surface of this app.
   */
  async request (endpoint: string) {
    try {
      const res = await fetch(process.env.IMMICH_URL + '/api' + endpoint)
      if (res.status === 200) {
        const contentType = res.headers.get('Content-Type') || ''
        if (contentType.includes('application/json')) {
          return res.json()
        } else {
          return res
        }
      } else {
        log('Immich API status ' + res.status)
        console.log(await res.text())
      }
    } catch (e) {
      log('Unable to reach Immich on ' + process.env.IMMICH_URL)
    }
  }

  /**
   * Handle an incoming request for a shared link `key`. This is the main function which
   * communicates with Immich and returns the output back to the visitor.
   *
   * Possible HTTP responses are:
   *
   * 200 - either a photo gallery or the unlock page.
   * 401 - the visitor provided a password but it was invalid.
   * 404 - any other failed request. Check console.log for details.
   */
  async handleShareRequest (request: IncomingShareRequest, res: Response) {
    addResponseHeaders(res)
    if (!immich.isKey(request.key)) {
      // This is not a valid key format
      log('Invalid share key ' + request.key)
      res.status(404).send()
    } else {
      // Get information about the shared link via Immich API
      const sharedLinkRes = await immich.getShareByKey(request.key, request.password)
      if (!sharedLinkRes.valid) {
        // This isn't a valid request - check the console for more information
        res.status(404).send()
      } else if (sharedLinkRes.passwordRequired && request.password) {
        // A password is required, but the visitor-provided one doesn't match
        log('Invalid password for key ' + request.key)
        res.status(401).send()
      } else if (sharedLinkRes.passwordRequired) {
        // Password required - show the visitor the password page
        // `req.params.key` should already be sanitised at this point, but it never hurts to be explicit
        const key = request.key.replace(/[^\w-]/g, '')
        res.render('password', { key, lgConfig: render.lgConfig })
      } else if (sharedLinkRes.link) {
        // Valid shared link
        const link = sharedLinkRes.link
        if (!link.assets.length) {
          log('No assets for key ' + request.key)
          res.status(404).send()
        } else if (link.assets.length === 1) {
          // This is an individual item (not a gallery)
          log('Serving link ' + request.key)
          const asset = link.assets[0]
          if (asset.type === AssetType.image && !getConfigOption('ipp.singleImageGallery')) {
            // For photos, output the image directly unless configured to show a gallery
            await render.assetBuffer(res, link.assets[0], request.size)
          } else {
            // Show a gallery page
            const openItem = getConfigOption('ipp.singleItemAutoOpen', true) ? 1 : 0
            await render.gallery(res, link, openItem)
          }
        } else {
          // Multiple images - render as a gallery
          log('Serving link ' + request.key)
          await render.gallery(res, link)
        }
      } else {
        log('Unknown error with key ' + request.key)
        res.status(404).send()
      }
    }
  }

  /**
   * Query Immich for the SharedLink metadata for a given key.
   * The key is what is returned in the URL when you create a share in Immich.
   */
  async getShareByKey (key: string, password?: string): Promise<SharedLinkResult> {
    let link
    const url = this.buildUrl(process.env.IMMICH_URL + '/api/shared-links/me', {
      key,
      password
    })
    const res = await fetch(url)
    const contentType = res.headers.get('Content-Type') || ''
    if (contentType.includes('application/json')) {
      const jsonBody = await res.json()
      if (jsonBody) {
        if (res.status === 200) {
          // Normal response - get the shared assets
          link = jsonBody as SharedLink
          if (link.expiresAt && dayjs(link.expiresAt) < dayjs()) {
            // This link has expired
            log('Expired link ' + key)
          } else {
            // Filter assets to exclude trashed assets
            link.assets = link.assets.filter(asset => !asset.isTrashed)
            // Populate the shared assets with the public key/password
            link.assets.forEach(asset => {
              asset.key = key
              asset.password = password
            })
            return {
              valid: true,
              link
            }
          }
        } else if (res.status === 401 && jsonBody?.message === 'Invalid password') {
          // Password authentication required
          return {
            valid: true,
            passwordRequired: true
          }
        }
      }
    }
    // Otherwise return failure
    log('Immich response ' + res.status + ' for key ' + key)
    return {
      valid: false
    }
  }

  /**
   * Stream asset buffer data from Immich.
   *
   * For photos, you can request 'thumbnail' or 'original' size.
   * For videos, it is Immich's streaming quality, not the original quality.
   */
  async getAssetBuffer (asset: Asset, size?: ImageSize) {
    switch (asset.type) {
      case AssetType.image:
        size = size === ImageSize.thumbnail ? ImageSize.thumbnail : ImageSize.original
        return this.request(this.buildUrl('/assets/' + encodeURIComponent(asset.id) + '/' + size, {
          key: asset.key,
          password: asset.password
        }))
      case AssetType.video:
        return this.request(this.buildUrl('/assets/' + encodeURIComponent(asset.id) + '/video/playback', {
          key: asset.key,
          password: asset.password
        }))
    }
  }

  /**
   * Get the content-type of an Immich asset
   */
  async getContentType (asset: Asset) {
    const assetBuffer = await this.getAssetBuffer(asset)
    return assetBuffer.headers.get('Content-Type')
  }

  /**
   * Build safely-encoded URL string
   */
  buildUrl (baseUrl: string, params: { [key: string]: string | undefined } = {}) {
    // Remove empty properties
    params = Object.fromEntries(Object.entries(params).filter(([_, value]) => !!value))
    let query = ''
    // Safely encode query parameters
    if (Object.entries(params).length) {
      query = '?' + (new URLSearchParams(params as {
        [key: string]: string
      })).toString()
    }
    return baseUrl + query
  }

  /**
   * Return the image data URL for a photo
   */
  photoUrl (key: string, id: string, size?: ImageSize, password?: string) {
    const params = { key, size }
    if (password) {
      Object.assign(params, this.encryptPassword(password))
    }
    return this.buildUrl(`/photo/${key}/${id}`, params)
  }

  /**
   * Return the video data URL for a video
   */
  videoUrl (key: string, id: string, password?: string) {
    const params = password ? this.encryptPassword(password) : {}
    return this.buildUrl(`/video/${key}/${id}`, params)
  }

  /**
   * Check if a provided ID matches the Immich ID format
   */
  isId (id: string) {
    return !!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  }

  /**
   * Check if a provided key matches the Immich shared-link key format.
   * It appears that the key is always 67 chars long, but since I don't know that this
   * will always be the case, I've left it open-ended.
   */
  isKey (key: string) {
    return !!key.match(/^[\w-]+$/)
  }

  /**
   * When loading assets from a password-protected link, make the decryption key valid for a
   * short time. If the visitor loads the share link again, it will renew that expiry time.
   * Even though the recipient already knows the password, this is just in case - for example
   * to protect against the password-protected link being revoked, but the asset links still
   * being valid.
   */
  encryptPassword (password: string) {
    return encrypt(JSON.stringify({
      password,
      expires: dayjs().add(1, 'hour').format()
    }))
  }

  async accessible () {
    return !!(await immich.request('/server/ping'))
  }
}

const immich = new Immich()

export default immich
