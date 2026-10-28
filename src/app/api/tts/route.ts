import { NextRequest, NextResponse } from 'next/server';
import { EdgeTTS } from 'node-edge-tts';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get('text');
  const accent = searchParams.get('accent') || 'en-US';
  const voice = searchParams.get('voice') || (accent === 'en-GB' ? 'en-GB-RyanNeural' : 'en-US-JennyNeural');
  const rateMultiplier = parseFloat(searchParams.get('rate') || '1.0');

  if (!text || !text.trim()) {
    return new NextResponse('Missing text parameter', { status: 400 });
  }

  try {
    // Format rate into EdgeTTS percentage format (e.g. 1.0 -> "+0%", 0.85 -> "-15%")
    const rateDiff = Math.round((rateMultiplier - 1.0) * 100);
    const rateStr = rateDiff >= 0 ? `+${rateDiff}%` : `${rateDiff}%`;

    const tts = new EdgeTTS({
      voice,
      rate: rateStr,
      timeout: 10000,
    });

    const chunks: Buffer[] = [];
    for await (const chunk of tts.streamAudio(text.trim())) {
      if (Buffer.isBuffer(chunk)) {
        chunks.push(chunk);
      }
    }

    const audioBuffer = Buffer.concat(chunks);

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Edge TTS synthesis error:', error);
    return new NextResponse('TTS synthesis failed', { status: 500 });
  }
}
