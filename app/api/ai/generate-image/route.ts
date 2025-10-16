import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Image prompt is required' },
        { status: 400 }
      )
    }

    if (!process.env.NEBIUS_API_KEY) {
      return NextResponse.json(
        { error: 'Nebius API key not configured' },
        { status: 500 }
      )
    }

    // Enhanced prompt for child-friendly images
    const enhancedPrompt = `${prompt}. Child-friendly, colorful, safe, educational, cartoon style, bright and cheerful, suitable for kids. CRITICAL: ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS, NO WRITING, NO CAPTIONS, NO TYPOGRAPHY anywhere in the image.`

    const response = await fetch('https://api.studio.nebius.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEBIUS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'black-forest-labs/flux-schnell',
        prompt: enhancedPrompt,
        width: 768,
        height: 768,
        num_inference_steps: 4,
        negative_prompt: 'text, words, letters, writing, captions, typography, adult content, violence, scary, dark, inappropriate',
        response_extension: 'png',
        response_format: 'b64_json',
        seed: -1,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Nebius API error:', response.status, errorText)
      return NextResponse.json(
        { error: 'Failed to generate image' },
        { status: 500 }
      )
    }

    const data = await response.json()
    
    if (!data.data || !data.data[0] || !data.data[0].b64_json) {
      return NextResponse.json(
        { error: 'Invalid response from image generation API' },
        { status: 500 }
      )
    }

    // Return base64 image directly
    const base64Image = `data:image/png;base64,${data.data[0].b64_json}`

    return NextResponse.json({
      imageUrl: base64Image,
      prompt: enhancedPrompt,
    })

  } catch (error) {
    console.error('Error in generate-image API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}