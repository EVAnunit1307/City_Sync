import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb'; // ElevenLabs "George" - free tier compatible

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ELEVENLABS_API_KEY is not configured on the server.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { text } = body as { text: string };

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text input is required.' },
        { status: 400 }
      );
    }

    const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
    const elevenlabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    const ttsResponse = await fetch(elevenlabsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: text.trim(),
        model_id: 'eleven_flash_v2_5',
        voice_settings: {
          stability: 1.0,
          similarity_boost: 0.3,
          style: 0.0,
          use_speaker_boost: false,
        },
      }),
    });

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error('ElevenLabs API error:', ttsResponse.status, errorText);
      return NextResponse.json(
        {
          error: `ElevenLabs API returned ${ttsResponse.status}: ${errorText}`,
        },
        { status: ttsResponse.status }
      );
    }

    const audioBuffer = await ttsResponse.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.byteLength),
      },
    });
  } catch (error) {
    console.error('Speak API error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.',
      },
      { status: 500 }
    );
  }
}
