import { imageValidation } from './imageValidation';

describe('imageValidation', () => {
  describe('validateImage', () => {
    const makeFile = (name: string, type: string, size: number): File =>
      new File(['x'.repeat(size)], name, { type });

    it('accepts a valid JPEG file', () => {
      const file = makeFile('photo.jpg', 'image/jpeg', 1024);
      expect(imageValidation.validateImage(file)).toBeNull();
    });

    it('accepts a valid PNG file', () => {
      const file = makeFile('photo.png', 'image/png', 1024);
      expect(imageValidation.validateImage(file)).toBeNull();
    });

    it('accepts a valid WebP file', () => {
      const file = makeFile('photo.webp', 'image/webp', 1024);
      expect(imageValidation.validateImage(file)).toBeNull();
    });

    it('accepts a file with valid extension but empty MIME type', () => {
      // Browsers sometimes don't set type correctly
      const file = makeFile('photo.jpg', '', 1024);
      expect(imageValidation.validateImage(file)).toBeNull();
    });

    it('rejects a GIF file', () => {
      const file = makeFile('animation.gif', 'image/gif', 1024);
      const error = imageValidation.validateImage(file);
      expect(error).not.toBeNull();
      expect(error!.field).toBe('type');
    });

    it('rejects an SVG file', () => {
      const file = makeFile('icon.svg', 'image/svg+xml', 1024);
      const error = imageValidation.validateImage(file);
      expect(error).not.toBeNull();
      expect(error!.field).toBe('type');
    });

    it('rejects a PDF file', () => {
      const file = makeFile('doc.pdf', 'application/pdf', 1024);
      const error = imageValidation.validateImage(file);
      expect(error).not.toBeNull();
      expect(error!.field).toBe('type');
    });

    it('rejects a file larger than 5MB', () => {
      const size = 5 * 1024 * 1024 + 1; // 5MB + 1 byte
      const file = makeFile('big.jpg', 'image/jpeg', size);
      const error = imageValidation.validateImage(file);
      expect(error).not.toBeNull();
      expect(error!.field).toBe('size');
      expect(error!.message).toContain('5MB');
    });

    it('accepts a file exactly 5MB', () => {
      const size = 5 * 1024 * 1024;
      const file = makeFile('exact.png', 'image/png', size);
      expect(imageValidation.validateImage(file)).toBeNull();
    });
  });

  describe('formatFileSize', () => {
    it('returns "0 Bytes" for 0', () => {
      expect(imageValidation.formatFileSize(0)).toBe('0 Bytes');
    });

    it('formats bytes', () => {
      expect(imageValidation.formatFileSize(500)).toBe('500 Bytes');
    });

    it('formats kilobytes', () => {
      expect(imageValidation.formatFileSize(1024)).toBe('1 KB');
    });

    it('formats megabytes', () => {
      expect(imageValidation.formatFileSize(1048576)).toBe('1 MB');
    });

    it('formats fractional kilobytes', () => {
      expect(imageValidation.formatFileSize(1536)).toBe('1.5 KB');
    });
  });
});
