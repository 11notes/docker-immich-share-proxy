function initLightGallery (config = {}) {
  lightGallery(document.getElementById('lightgallery'), Object.assign({
    plugins: [lgZoom, lgThumbnail, lgVideo, lgFullscreen],
    /*
    This license key was graciously provided by LightGallery under their
    GPLv3 open-source project license:
    */
    licenseKey: '125F617E-8943460F-B14CC47C-BD5DC3E8'
    /*
    Please do not take it and use it for other projects, as it was provided
    specifically for 11notes/immich-share-proxy.
    */
  }, config))
}
