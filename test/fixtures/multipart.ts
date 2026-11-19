/** A file part of a form, kept as bytes so no browser File from jsdom reaches a route's undici parser. */
export type FilePart = { filename: string; type: string; bytes: Uint8Array };

export const MULTIPART_BOUNDARY = "menton-test-boundary";

/**
 * A multipart body written out by hand, so a route test does not depend on jsdom's FormData or File. Routes parse it
 * with Node's undici, which also needs `vi.stubGlobal("File", NodeFile)` (from `node:buffer`) on Node 24.
 */
export function multipartBody(fields: Record<string, string | FilePart>) {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  for (const [name, value] of Object.entries(fields)) {
    if (typeof value === "string") {
      chunks.push(
        encoder.encode(
          `--${MULTIPART_BOUNDARY}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
        ),
      );
    } else {
      chunks.push(
        encoder.encode(
          `--${MULTIPART_BOUNDARY}\r\nContent-Disposition: form-data; name="${name}"; filename="${value.filename}"\r\nContent-Type: ${value.type}\r\n\r\n`,
        ),
        value.bytes,
        encoder.encode("\r\n"),
      );
    }
  }
  chunks.push(encoder.encode(`--${MULTIPART_BOUNDARY}--\r\n`));
  const body = new Uint8Array(
    chunks.reduce((sum, chunk) => sum + chunk.length, 0),
  );
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  return body;
}

export const MULTIPART_CONTENT_TYPE = `multipart/form-data; boundary=${MULTIPART_BOUNDARY}`;
