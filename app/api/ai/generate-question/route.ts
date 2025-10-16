import { NextRequest, NextResponse } from 'next/server'

interface QuestionResponse {
  statement: string
  isTrue: boolean
  imagePrompt: string
  difficulty: number
}

export async function POST(request: NextRequest) {
  try {
    const { age } = await request.json()

    if (!age || age < 3 || age > 12) {
      return NextResponse.json(
        { error: 'Age must be between 3 and 12' },
        { status: 400 }
      )
    }

    const deepseekApiKey = process.env.DEEPSEEK_API_KEY
    const deepseekApiUrl = process.env.DEEPSEEK_API_URL

    if (!deepseekApiKey || !deepseekApiUrl) {
      return NextResponse.json(
        { error: 'DeepSeek API configuration missing' },
        { status: 500 }
      )
    }

    // Create age-appropriate prompt
    const prompt = `Generate a simple true/false question for a ${age}-year-old child. The question should be:
- Age-appropriate and educational
- About basic concepts like colors, animals, shapes, numbers, or everyday objects
- Simple and easy to understand
- Either clearly true or clearly false

Please respond with a JSON object containing:
- "statement": A simple statement (e.g., "The dog is red", "Houses are big", "Cats can fly")
- "isTrue": boolean indicating if the statement is true or false
- "imagePrompt": A detailed prompt for generating an image that illustrates the statement (describe what should be shown in the image)
- "difficulty": A number from 1-3 based on the child's age (1 for ages 3-5, 2 for ages 6-8, 3 for ages 9-12)

Example for age 4:
{
  "statement": "The sun is yellow",
  "isTrue": true,
  "imagePrompt": "A bright yellow sun in a clear blue sky, cartoon style, child-friendly illustration",
  "difficulty": 1
}

Make sure the statement and image prompt are appropriate for a ${age}-year-old child.`

    const response = await fetch(deepseekApiUrl, {
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
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      throw new Error('No content received from DeepSeek API')
    }

    // Parse the JSON response from DeepSeek
    let questionData: QuestionResponse
    try {
      questionData = JSON.parse(content)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (parseError) {
      // If JSON parsing fails, try to extract information manually
      console.error('Failed to parse DeepSeek response as JSON:', content)
      return NextResponse.json(
        { error: 'Invalid response format from AI' },
        { status: 500 }
      )
    }

    // Validate the response structure
    if (!questionData.statement || typeof questionData.isTrue !== 'boolean' || !questionData.imagePrompt) {
      return NextResponse.json(
        { error: 'Incomplete question data from AI' },
        { status: 500 }
      )
    }

    return NextResponse.json(questionData)

  } catch (error) {
    console.error('Error generating question:', error)
    return NextResponse.json(
      { error: 'Failed to generate question' },
      { status: 500 }
    )
  }
}