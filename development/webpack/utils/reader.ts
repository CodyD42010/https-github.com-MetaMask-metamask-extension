import { fstatSync, readSync } from 'node:fs';

export class Reader {
  private fd: number;

  private buffer: Buffer;

  private offset: number = 0;

  /**
   * A simple class to read data from a file descriptor.
   *
   * @param fd - The file descriptor to read from.
   * @param maxReadSize - The maximum number of bytes to read at once.
   */
  constructor(fd: number, maxReadSize: number) {
    this.fd = fd;
    this.buffer = Buffer.allocUnsafe(maxReadSize);
  }

  /**
   * Reads `bytes` from the file and returns a Buffer of the read bytes.
   *
   * @param bytes
   * @throws Throws an error if the bytes read is less than the bytes requested
   * or if maxReadSize is less than the bytes requested.
   */
  read(bytes: number) {
    const bytesRead = readSync(this.fd, this.buffer, 0, bytes, this.offset);
    if (bytesRead !== bytes) {
      throw new Error('out of bounds');
    }
    this.offset += bytesRead;
    return this.buffer.subarray(0, bytesRead);
  }

  /**
   * Updates the internal position by the amount specified in `bytes`.
   *
   * @param bytes
   */
  seek(bytes: number) {
    this.offset += bytes;
    return this;
  }

  /**
   * Reads 4 bytes as a big-endian unsigned 32-bit integer.
   *
   * @param offset - The offset to read from relative to the current read
   * position.
   * @throws Throws an error if the bytes read is less than 4 or maxReadSize
   * is less than 4.
   */
  readUInt32BE(offset: number) {
    return this.seek(offset).read(4).readUInt32BE(0);
  }

  /**
   * Reads 1 byte as an unsigned 8-bit integer.
   *
   * @param offset - The offset to read from relative to the current read
   * position.
   * @throws Throws an error if the bytes read is less than 1 or maxReadSize
   * is less than 1.
   */
  readUInt8(offset: number) {
    return this.seek(offset).read(1).readUInt8(0);
  }

  /**
   * Reads to the end of the file, allocating a new buffer for the operation.
   * This will seek the file to the end; no other read operations will be
   * possible unless the position is reset by seeking backwards.
   */
  readToEnd() {
    const { size } = fstatSync(this.fd);
    const remainingSize = size - this.offset;
    const buffer = Buffer.allocUnsafe(remainingSize);
    const bytesRead = readSync(this.fd, buffer, 0, remainingSize, this.offset);
    this.offset += bytesRead;
    return buffer;
  }
}
