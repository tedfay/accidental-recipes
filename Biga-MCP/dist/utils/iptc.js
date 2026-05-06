/**
 * Embedded-metadata writer for JPEG images (2FI-215).
 *
 * Maps three logical fields onto EXIF tags via piexifjs (pure JS, no
 * native deps; JPEG only):
 *   credit    → ImageIFD.Artist
 *   copyright → ImageIFD.Copyright
 *   source    → ImageIFD.ImageDescription
 *
 * The schema names this `embedded_metadata` (not `iptc`) because the
 * writer uses EXIF tags — the spirit is IPTC, the implementation is
 * EXIF. Non-JPEG uploads skip this step entirely.
 */
import piexif from 'piexifjs';
export function writeEmbeddedMetadata(jpegBuffer, meta) {
    const binaryString = jpegBuffer.toString('binary');
    let exifObj;
    try {
        exifObj = piexif.load(binaryString);
    }
    catch {
        exifObj = { '0th': {}, Exif: {}, GPS: {}, '1st': {}, thumbnail: null };
    }
    exifObj['0th'] = {
        ...exifObj['0th'],
        [piexif.ImageIFD.Artist]: meta.credit,
        [piexif.ImageIFD.Copyright]: meta.copyright,
        [piexif.ImageIFD.ImageDescription]: meta.source,
    };
    const exifBytes = piexif.dump(exifObj);
    const newBinaryString = piexif.insert(exifBytes, binaryString);
    return Buffer.from(newBinaryString, 'binary');
}
