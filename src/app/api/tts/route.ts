import { NextRequest, NextResponse } from 'next/server';
import WebSocket from 'ws';
import { generateSecMsGecToken_V2, SEC_MS_GEC_VERSION_V2, TRUSTED_CLIENT_TOKEN, CHROMIUM_FULL_VERSION } from 'node-edge-tts/dist/drm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const token = generateSecMsGecToken_V2();
  const url = `wss://api.msedgeservices.com/tts/cognitiveservices/websocket/v1?Ocp-Apim-Subscription-Key=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${token}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION_V2}`;

  return new Promise<Response>((resolve) => {
    try {
      const ws = new WebSocket(url, {
        host: 'speech.platform.bing.com',
        origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache',
          'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_FULL_VERSION.split('.')[0]}.0.0.0 Safari/537.36 Edg/${CHROMIUM_FULL_VERSION.split('.')[0]}.0.0.0`,
          'Accept-Encoding': 'gzip, deflate, br, zstd',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      ws.on('open', () => {
        ws.close();
        resolve(new NextResponse('CONNECTED_SUCCESSFULLY', { status: 200 }));
      });

      ws.on('unexpected-response', (req, res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          resolve(new NextResponse(JSON.stringify({
            status: res.statusCode,
            headers: res.headers,
            body: body.substring(0, 1000)
          }, null, 2), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }));
        });
      });

      ws.on('error', (err) => {
        resolve(new NextResponse('WS_ERROR: ' + err.message, { status: 500 }));
      });
    } catch (e: any) {
      resolve(new NextResponse('CATCH_ERROR: ' + e.message, { status: 500 }));
    }
  });
}
