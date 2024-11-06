function initLightGallery (config = {}) {
  lightGallery(document.getElementById('lightgallery'), Object.assign({
    plugins: [lgZoom, lgThumbnail, lgVideo, lgFullscreen],
    /*
    This license key was graciously provided by LightGallery under their
    GPLv3 open-source project license:
    */
    licenseKey: '0000-0000-000-0000'
    /*
    Please do not take it and use it for other projects, as it was provided
    specifically for Immich Public Proxy.

    For your own projects you can use the default license key of
    0000-0000-000-0000 as per their docs:

    https://www.lightgalleryjs.com/docs/settings/#licenseKey
    */
  }, config))
}
