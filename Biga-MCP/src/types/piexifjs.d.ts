declare module 'piexifjs' {
  interface ExifObject {
    '0th': Record<number, unknown>;
    Exif: Record<number, unknown>;
    GPS: Record<number, unknown>;
    '1st': Record<number, unknown>;
    thumbnail?: string | null;
  }

  interface Piexif {
    load(binaryString: string): ExifObject;
    dump(exifObj: ExifObject): string;
    insert(exifBytes: string, binaryString: string): string;
    remove(binaryString: string): string;

    ImageIFD: {
      Artist: number;
      Copyright: number;
      ImageDescription: number;
      Make: number;
      Model: number;
      Software: number;
      DateTime: number;
      XResolution: number;
      YResolution: number;
    };

    ExifIFD: {
      DateTimeOriginal: number;
      DateTimeDigitized: number;
      UserComment: number;
    };
  }

  const piexif: Piexif;
  export default piexif;
  export type { ExifObject };
}
