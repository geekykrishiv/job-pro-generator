import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Forward the multipart form data to latexonline.cc
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
    }
    const body = Buffer.concat(chunks);

    const contentType = req.headers['content-type'] ?? 'multipart/form-data';

    const upstreamResponse = await fetch('https://latexonline.cc/compile', {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body,
    });

    const upstreamContentType = upstreamResponse.headers.get('content-type') ?? '';

    if (upstreamResponse.ok && upstreamContentType.includes('application/pdf')) {
      const pdfBuffer = Buffer.from(await upstreamResponse.arrayBuffer());
      res.setHeader('Content-Type', 'application/pdf');
      return res.status(200).send(pdfBuffer);
    } else {
      const errorText = await upstreamResponse.text();
      res.setHeader('Content-Type', 'text/plain');
      return res.status(500).send(errorText);
    }
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
