export type MediaKind = 'image' | 'video';

export interface MediaFormat {
  kind: MediaKind;
  contentType: string;
  extension: string;
}

export interface StepMedia {
  id: string;
  kind: MediaKind;
  contentType: string;
  name: string;
  size: number;
  url: string;
}
