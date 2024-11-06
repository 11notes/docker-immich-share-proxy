import dayjs from 'dayjs'
import { Request, Response } from 'express-serve-static-core'
import { ImageSize } from './types'

let config = {}
try {
  const configJson = require('../config.json')
  if (typeof configJson === 'object') config = configJson
} catch (e) { }

/**
 * Get a configuration option using dotted notation.
 *
 * @param path
 * @param [defaultOption] - Specify a default option to return if no configuation value is found
 *
 * @example
 * getConfigOption('ipp.singleImageGallery')
 */
export const getConfigOption = (path: string, defaultOption?: unknown) => {
  const value = path.split('.').reduce((obj: { [key: string]: unknown }, key) => (obj || {})[key], config)
  if (value === undefined) {
    return defaultOption
  } else {
    return value
  }
}

/**
 * Output a console.log message with timestamp
 */
export const log = (message: string) => console.log(dayjs().format() + ' ' + message)

/**
 * Sanitise the data for an incoming query string `size` parameter
 * e.g. https://example.com/share/abc...xyz?size=thumbnail
 */
export function getSize (req: Request) {
  return req.query?.size === 'thumbnail' ? ImageSize.thumbnail : ImageSize.original
}

export function toString (value: unknown) {
  return typeof value === 'string' ? value : ''
}

/**
 * Add response headers from config.json
 */
export function addResponseHeaders (res: Response) {
  Object.entries(getConfigOption('ipp.responseHeaders', {}) as { [key: string]: string })
    .forEach(([header, value]) => {
      res.set(header, value)
    })
}
