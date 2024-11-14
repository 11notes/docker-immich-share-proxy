# :: QEMU
FROM multiarch/qemu-user-static:x86_64-aarch64 as qemu

# :: Util
  FROM alpine as util

  RUN set -ex; \
    apk add --no-cache \
      git; \
    git clone https://github.com/11notes/util.git;

# :: Build
  FROM 11notes/node:stable as build
  ARG BUILD_VERSION=1.4.1
  ARG BUILD_ROOT=/immich-share-proxy

  USER root

  COPY ./node /${BUILD_ROOT}

  RUN set -ex; \
    cd ${BUILD_ROOT}; \
    npm install --save --omit=dev; \
    npx tsc --noCheck; \
    mkdir -p /node; \
    cp -R ${BUILD_ROOT}/* /node;

# :: Header
  FROM --platform=linux/arm64 11notes/node:stable
  COPY --from=qemu /usr/bin/qemu-aarch64-static /usr/bin
  COPY --from=util /util/docker /usr/local/bin
  COPY --from=build /node /node
  ENV NODE_ENV=production
  ENV APP_NAME="immich-share-proxy"
  ENV APP_VERSION=1.4.1
  ENV IMMICH_URL="http://immich.server:2283"

# :: Run
  USER root

  # :: prepare image
    RUN set -ex; \
      apk --no-cache --update upgrade;

  # :: copy root filesystem changes and add execution rights to init scripts
    COPY --chown=1000:1000 ./rootfs /
    RUN set -ex; \
      chmod +x -R /usr/local/bin;

  # :: change home path for existing user and set correct permission
    RUN set -ex; \
      usermod -d ${APP_ROOT} docker; \
      chown -R 1000:1000 \
        ${APP_ROOT};

# :: Monitor
  HEALTHCHECK --interval=5s --timeout=3s CMD /usr/local/bin/healthcheck.sh || exit 1

# :: Start
  USER docker
  ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]