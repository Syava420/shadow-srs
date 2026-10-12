import { NextResponse } from 'next/server';
import ankiData from '@/data/anki-deck.json';

export async function GET() {
  return NextResponse.json(ankiData);
}
