/**
 * NDJSON (Newline-Delimited JSON) framer
 * Handles streaming TCP chunks:
 * - Buffers partial chunks across stream boundaries
 * - Extracts multiple newline-delimited lines per chunk
 * - Trims carriage returns (\r) and ignores empty lines
 */
export class NdjsonFramer {
  private buffer: string = '';

  /**
   * Pushes incoming raw string chunk into the framer.
   * Returns an array of complete line strings extracted so far.
   */
  push(chunk: string): string[] {
    this.buffer += chunk;
    const lines: string[] = [];

    let newlineIndex: number;
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const rawLine = this.buffer.slice(0, newlineIndex);
      this.buffer = this.buffer.slice(newlineIndex + 1);

      const trimmed = rawLine.replace(/\r$/, '').trim();
      if (trimmed.length > 0) {
        lines.push(trimmed);
      }
    }

    return lines;
  }

  /**
   * Returns whatever unparsed data remains in the buffer.
   */
  getRemainder(): string {
    return this.buffer;
  }

  /**
   * Resets the buffer.
   */
  reset(): void {
    this.buffer = '';
  }

  /**
   * Encodes a payload into an NDJSON line (\n terminated).
   */
  static serialize(payload: unknown): string {
    return JSON.stringify(payload) + '\n';
  }

  /**
   * Decodes an NDJSON line safely into a typed object.
   */
  static parse<T = unknown>(line: string): T {
    return JSON.parse(line) as T;
  }
}
