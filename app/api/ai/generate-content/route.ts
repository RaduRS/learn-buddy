import { NextResponse } from 'next/server'

const parseQuestionData = (content: string) => {
  let cleaned = content.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  }

  try {
    return JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      return JSON.parse(match[0])
    } catch {
      return null
    }
  }
}

export async function POST(request: Request) {
  try {
    const { age, questionNumber, timestamp, usedQuestions = [], trueFalseHistory = [] } = await request.json()

    // Validate input
    if (!age || age < 3 || age > 18) {
      return NextResponse.json(
        { error: 'Age must be between 3 and 18' },
        { status: 400 }
      )
    }

    // Check for required API keys
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY
    const replicateApiKey = process.env.REPLICATE_API_KEY

    if (!deepseekApiKey || !replicateApiKey) {
      return NextResponse.json(
        { error: 'API keys not configured' },
        { status: 500 }
      )
    }

    // Generate unique seed for randomization
    const seed = `${timestamp}-${questionNumber}-${Math.random()}`

    // Analyze true/false history for balance
     const trueCount = trueFalseHistory.filter((val: boolean) => val === true).length
     const falseCount = trueFalseHistory.filter((val: boolean) => val === false).length
    const totalPrevious = trueFalseHistory.length
    
    let balanceGuidance = ""
    if (totalPrevious === 0) {
      balanceGuidance = "This is the first question - randomly choose true or false."
    } else if (trueCount > falseCount) {
      balanceGuidance = `Previous questions: ${trueCount} true, ${falseCount} false. STRONGLY PREFER generating a FALSE statement to balance the game.`
    } else if (falseCount > trueCount) {
      balanceGuidance = `Previous questions: ${trueCount} true, ${falseCount} false. STRONGLY PREFER generating a TRUE statement to balance the game.`
    } else {
      balanceGuidance = `Previous questions: ${trueCount} true, ${falseCount} false. Perfectly balanced - randomly choose true or false.`
    }

    // Simple, varied questions for young children (no fixed examples)
      const questionPrompt = `Create a VERY SIMPLE true/false question for a ${age}-year-old child.

CRITICAL REQUIREMENTS:
- Use ONLY simple words a ${age}-year-old knows
- Keep sentences SHORT (maximum 6–8 words)
- Make it about things kids see every day
- Question ${questionNumber} with seed ${seed} — produce a UNIQUE idea (not a paraphrase)
- Make it either clearly TRUE or clearly FALSE — no ambiguity
${usedQuestions.length > 0 ? `- DO NOT REPEAT or paraphrase any of these used questions: ${usedQuestions.join(', ')}` : ''}

BALANCE GUIDANCE: ${balanceGuidance}

TOPIC SUGGESTIONS (pick ONE randomly; do NOT include examples):
- animals, colors, foods, weather, school objects, nature, vehicles,
  family, playground activities, simple body parts, safety, everyday routines

AVOID:
- complex or confusing ideas
- scientific explanations or abstract concepts
- long sentences or difficult vocabulary

Return ONLY a JSON object with:
{
  "statement": "your simple question (max 8 words)",
  "isTrue": true/false,
  "difficulty": 1
}`

    // Call DeepSeek API
    const deepseekResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: questionPrompt
          }
        ],
        temperature: 0.9, // Higher temperature for more randomness
        max_tokens: 200,
      }),
    })

    if (!deepseekResponse.ok) {
      throw new Error('Failed to generate question')
    }

    const deepseekData = await deepseekResponse.json()
    const questionContent = deepseekData.choices[0]?.message?.content

    if (!questionContent) {
      throw new Error('No question content received')
    }

    const questionData = parseQuestionData(questionContent)
    if (!questionData) {
      throw new Error('Invalid question format received')
    }

    // Validate question data
    if (!questionData.statement || typeof questionData.isTrue !== 'boolean') {
      throw new Error('Invalid question data structure')
    }

    // Create enhanced image prompt with stronger text prevention
     const imagePrompt = `Simple cartoon illustration showing: ${questionData.statement.replace(/[.!?]/g, '').replace(/\b(is|are|can|have|has)\b/g, '').trim()}

ULTRA STRICT NO-TEXT REQUIREMENTS:
- ZERO TEXT - NO LETTERS, WORDS, SYMBOLS, NUMBERS, CHARACTERS
- NO WRITING OF ANY KIND - NOT EVEN DECORATIVE TEXT
- NO SIGNS, LABELS, CAPTIONS, TITLES, SUBTITLES
- NO SPEECH BUBBLES, THOUGHT BUBBLES, DIALOGUE
- NO WATERMARKS, LOGOS, BRAND NAMES
- NO MATHEMATICAL SYMBOLS (+, -, =, etc.)
- NO PUNCTUATION MARKS (., !, ?, etc.)
- NO ARROWS WITH TEXT OR LABELS
- PURE VISUAL ONLY - LIKE A SILENT MOVIE

Style: Clean cartoon, bright colors, simple shapes, child-friendly, minimalist`

    // Call Replicate flux-schnell (sync via Prefer: wait)
    const replicateResponse = await fetch(
      'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${replicateApiKey}`,
          'Prefer': 'wait',
        },
        body: JSON.stringify({
          input: {
            prompt: imagePrompt,
            aspect_ratio: '1:1',
            num_outputs: 1,
            output_format: 'png',
            output_quality: 90,
            num_inference_steps: 4,
          },
        }),
      }
    )

    if (!replicateResponse.ok) {
      const errorText = await replicateResponse.text()
      console.error('Replicate API error:', replicateResponse.status, errorText)
      throw new Error('Failed to generate image')
    }

    const replicateData = await replicateResponse.json()
    const outputUrl: string | undefined = Array.isArray(replicateData?.output)
      ? replicateData.output[0]
      : replicateData?.output

    if (!outputUrl) {
      throw new Error('No image data received')
    }

    const imgRes = await fetch(outputUrl)
    if (!imgRes.ok) {
      throw new Error('Failed to fetch generated image')
    }
    const imgBuf = Buffer.from(await imgRes.arrayBuffer())
    const imageBase64 = imgBuf.toString('base64')

    // Return the combined content
    return NextResponse.json({
      statement: questionData.statement,
      isTrue: questionData.isTrue,
      difficulty: questionData.difficulty || 1,
      imageUrl: `data:image/png;base64,${imageBase64}`,
    })

  } catch (error) {
    console.error('Error in generate-content API:', error)
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    )
  }
}
