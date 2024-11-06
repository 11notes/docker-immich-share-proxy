![Banner](https://github.com/11notes/defaults/blob/main/static/img/banner.png?raw=true)

# 🏔️ Alpine - Immich Share Proxy
![size](https://img.shields.io/docker/image-size/11notes/immich-share-proxy/1.4.0?color=0eb305) ![version](https://img.shields.io/docker/v/11notes/immich-share-proxy/1.4.0?color=eb7a09) ![pulls](https://img.shields.io/docker/pulls/11notes/immich-share-proxy?color=2b75d6)

**Expose your Immich shares publicly without exposing Immich!**

# SYNOPSIS
**What can I do with this?** This image will make it possible to securely expose your Immich shared albums without giving any access to Immich itself. It acts as a proxy between your reverse proxy and Immich to only expose what is needed to share. It works on the same domain name, there is no need to configure an alternative name just for sharing. You can check the Traefik example on how to use Immich and the share proxy on the same domain.

**This is cool and all, but how does it work?**
First, setup your external domain in your Immich instance to the same domain you will be using on Traefik to expose Immich internally and externally.

![Immich External Domain](https://github.com/11notes/docker-immich-share-proxy/blob/main/img/immich.external.domain.png?raw=true)

After that, simply create a share in Immich. You can use passwords too, but you can’t prevent downloading, this option is ignored. You will get a sharable link.

![Immich Sharing Link](https://github.com/11notes/docker-immich-share-proxy/blob/main/img/immich.share.link.png?raw=true)

That’s it. If you send someone this link, and you have setup your Traefik or Nginx for the /share prefix, the person receiving the share can now access all pictures from the share, without having any access to Immich itself. You can of course add additional authentication via Authentik middleware or whatever you prefer or simply use the password feature of Immich itself.

# COMPOSE
```yaml
name: "immich"
services:
  share-proxy:
    image: "11notes/immich-share-proxy:1.4.0"
    container_name: "immich.share-proxy"
    environment:
      TZ: "Europe/Zurich"
      IMMICH_URL: "http://server:2283"
      LIGHT_GALLERY_CONFIG: |-
        {
          "ipp": {
            "singleImageGallery": true
          },
          "lightGallery": {
            "controls": true,
            "download": false,
            "mobileSettings": {
              "controls": true,
              "showCloseIcon": true,
              "download": false
            }
          }
        }
    ports:
      - "3000:3000/tcp"
    # same FQDN (photos.domain.com) as Immich itself but only on path /share
    labels:
      - "traefik/http/routers/photos.domain.com-share/entrypoints=https"
      - "traefik/http/routers/photos.domain.com-share/tls=true"
      - "traefik/http/routers/photos.domain.com-share/rule=(Host(`photos.domain.com`)&&PathPrefix(`/share`))"
      - "traefik/http/routers/photos.domain.com-share/service=photos.domain.com-share"
      - "traefik/http/services/photos.domain.com-share/loadbalancer/servers/0/url=http://share-proxy:3000"
    networks:
      frontend:
    restart: "always"

  server:
    image: "ghcr.io/immich-app/immich-server:v1.118.2"
    container_name: "immich"
    ports:
      - "2283:2283/tcp"
    labels:
      - "traefik/http/routers/photos.domain.com/entrypoints=https"
      - "traefik/http/routers/photos.domain.com/tls=true"
      - "traefik/http/routers/photos.domain.com/rule=(Host(`photos.domain.com`))"
      - "traefik/http/routers/photos.domain.com/service=photos.domain.com"
      - "traefik/http/services/photos.domain.com/loadbalancer/servers/0/url=http://server:2283"
    networks:
      frontend:
    restart: "always"

networks:
  frontend:
```

# DEFAULT SETTINGS
| Parameter | Value | Description |
| --- | --- | --- |
| `user` | docker | user docker |
| `uid` | 1000 | user id 1000 |
| `gid` | 1000 | group id 1000 |
| `home` | /node | home directory of user docker |

# ENVIRONMENT
| Parameter | Value | Default |
| --- | --- | --- |
| `TZ` | [Time Zone](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones) | |
| `DEBUG` | Show debug information | |
| `HEALTHCHECK_URL` | URL to use for health check | http://localhost:3000/healthcheck |
| `IMMICH_URL` | Immich internal URL | http://immich.server:2283 |
| `LIGHT_GALLERY_CONFIG` | Inline config for [lightGallery](https://github.com/sachinchoolur/lightGallery) |  |

# SOURCE
* [11notes/immich-share-proxy:1.4.0](https://github.com/11notes/docker-immich-share-proxy/tree/1.4.0)

# PARENT IMAGE
* [11notes/node:stable](https://hub.docker.com/r/11notes/node)

# BUILT WITH
* [lightGallery](https://github.com/sachinchoolur/lightGallery)
* [alpine](https://alpinelinux.org)

# TIPS
* Use a reverse proxy like Traefik, Nginx to terminate TLS with a valid certificate
* Use Let’s Encrypt certificates to protect your SSL endpoints

# ElevenNotes<sup>™️</sup>
This image is provided to you at your own risk. Always make backups before updating an image to a new version. Check the changelog for breaking changes. You can find all my repositories on [github](https://github.com/11notes).
    