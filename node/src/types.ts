export enum AssetType {
  image = 'IMAGE',
  video = 'VIDEO'
}

export interface Asset {
  id: string;
  key: string;
  password?: string;
  type: AssetType;
  isTrashed: boolean;
}

export interface SharedLink {
  key: string;
  type: string;
  description?: string;
  assets: Asset[];
  album?: {
    id: string;
    albumName?: string;
  }
  expiresAt: string | null;
}

export interface SharedLinkResult {
  valid: boolean;
  key?: string;
  passwordRequired?: boolean;
  link?: SharedLink;
}

export enum ImageSize {
  thumbnail = 'thumbnail',
  original = 'original'
}

export interface IncomingShareRequest {
  key: string;
  password?: string;
  size?: ImageSize;
}
