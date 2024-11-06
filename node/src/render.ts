import immich from './immich'
import { Response } from 'express-serve-static-core'
import { Asset, AssetType, ImageSize, SharedLink } from './types'
import { getConfigOption } from './functions'

class Render {
  lgConfig

  constructor () {
    this.lgConfig = getConfigOption('lightGallery', {})
  }

  async assetBuffer (res: Response, asset: Asset, size?: ImageSize) {
    const data = await immich.getAssetBuffer(asset, size)
    if (data) {
      for (const header of ['content-type', 'content-length']) {
        res.set(header, data.headers.get(header))
      }
      res.send(Buffer.from(await data.arrayBuffer()))
    } else {
      res.status(404).send()
    }
  }

  /**
   * Render a gallery page for a given SharedLink, using EJS and lightGallery.
   *
   * @param res - ExpressJS Response
   * @param share - Immich `shared-link` containing the assets to show in the gallery
   * @param [openItem] - Immediately open a lightbox to the Nth item when the gallery loads
   */
  async gallery (res: Response, share: SharedLink, openItem?: number) {
    const items = []
    for (const asset of share.assets) {
      let video
      if (asset.type === AssetType.video) {
        // Populate the data-video property
        video = JSON.stringify({
          source: [
            {
              src: immich.videoUrl(share.key, asset.id, asset.password),
              type: await immich.getContentType(asset)
            }
          ],
          attributes: {
            preload: false,
            controls: true
          }
        })
      }
      items.push({
        originalUrl: immich.photoUrl(share.key, asset.id, undefined, asset.password),
        thumbnailUrl: immich.photoUrl(share.key, asset.id, ImageSize.thumbnail, asset.password),
        video
      })
    }
    res.render('gallery', {
      items,
      openItem,
      title: this.title(share),
      lgConfig: getConfigOption('lightGallery', {})
    })
  }

  /**
   * Attempt to get a title from the link description or the album title
   */
  title (share: SharedLink) {
    return share.description || share?.album?.albumName || ''
  }
}

const render = new Render()

export default render
