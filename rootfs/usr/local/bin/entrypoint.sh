#!/bin/ash
  if [ -z "${1}" ]; then
    if [ ! -z "${LIGHT_GALLERY_CONFIG}" ]; then
      elevenLogJSON info "setting custom lightGallery config"
      echo "${LIGHT_GALLERY_CONFIG}" > ${APP_ROOT}/config.json
    fi

    elevenLogJSON info "starting ${APP_NAME} v${APP_VERSION}"
    cd ${APP_ROOT}
    set -- node \
      ./dist/index.js
  fi
  
  exec "$@"