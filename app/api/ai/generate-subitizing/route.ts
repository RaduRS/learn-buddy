import { NextRequest, NextResponse } from 'next/server'

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

interface SubitizingRequest {
  userAge: number
  difficulty: number
  questionNumber: number
  previousCorrect?: boolean
}

interface SubitizingPattern {
  objects: Array<{
    x: number
    y: number
    color: string
    shape: string
  }>
  correctAnswer: number
  difficulty: number
  timeLimit: number
  educationalTip?: string
  encouragement?: string
}

export async function POST(request: NextRequest) {
  let userAge: number = 6, difficulty: number = 1, questionNumber: number = 1, previousCorrect: boolean | undefined
  
  try {
    const requestData: SubitizingRequest = await request.json()
    userAge = requestData.userAge
    difficulty = requestData.difficulty
    questionNumber = requestData.questionNumber
    previousCorrect = requestData.previousCorrect

    if (!DEEPSEEK_API_KEY) {
      console.error('DEEPSEEK_API_KEY is not configured')
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 })
    }

    // Create a prompt for DeepSeek to generate subitizing patterns
    const prompt = `You are an educational AI helping create subitizing exercises for a ${userAge}-year-old child. 

Subitizing is the ability to quickly recognize the number of objects in a small group without counting. This is crucial for developing number sense.

Current context:
- Child's age: ${userAge} years
- Difficulty level: ${difficulty}/3
- Question number: ${questionNumber}
- Previous answer was: ${previousCorrect !== undefined ? (previousCorrect ? 'correct' : 'incorrect') : 'first question'}

Generate a JSON response with the following structure:
{
  "numObjects": number (3-7 for age 5-6, 1-6 for age 7+),
  "arrangement": "random" | "line" | "circle" | "square" | "triangle" | "dice_pattern",
  "educationalTip": "brief tip about subitizing or number recognition",
  "encouragement": "age-appropriate encouraging message",
  "timeLimit": number (milliseconds, 2000-4000 based on difficulty)
}

Guidelines:
- For younger children (5-6): Use 3-7 objects, longer time limits, simpler arrangements
- For older children (7+): Use 1-6 objects, shorter time limits, more complex arrangements
- Increase difficulty gradually as question number increases
- If previous answer was incorrect, provide a slightly easier pattern
- Educational tips should be simple and age-appropriate
- Encouragement should be positive and motivating

Respond only with valid JSON.`

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    })

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`)
    }

    const data = await response.json()
    const aiResponse = data.choices[0]?.message?.content

    if (!aiResponse) {
      throw new Error('No response from DeepSeek API')
    }

    // Parse the AI response
    let aiData
    try {
      aiData = JSON.parse(aiResponse)
    } catch (error) {
      console.error('Failed to parse AI response:', aiResponse)
      // Fallback to default pattern
      aiData = {
        numObjects: Math.min(userAge >= 6 ? 4 : 3, difficulty + 1),
        arrangement: 'random',
        educationalTip: 'Look at the objects quickly and trust your first instinct!',
        encouragement: 'You\'re doing great! Keep practicing!',
        timeLimit: userAge >= 6 ? 3000 : 3500
      }
    }

    // Generate the actual pattern based on AI recommendations
    const pattern = generatePattern(aiData)

    return NextResponse.json({
      ...pattern,
      educationalTip: aiData.educationalTip,
      encouragement: aiData.encouragement
    })

  } catch (error) {
    console.error('Error generating subitizing pattern:', error)
    
    // Fallback pattern generation
    const fallbackPattern = generateFallbackPattern(userAge, difficulty, questionNumber)
    
    return NextResponse.json(fallbackPattern)
  }
}

interface AIData {
  numObjects: number
  arrangement: string
  timeLimit: number
  educationalTip: string
  encouragement: string
}

function generatePattern(aiData: AIData): SubitizingPattern {
  const { numObjects, arrangement, timeLimit } = aiData
  const shapes = ['circle', 'square', 'triangle', 'star', 'heart']
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']
  
  const objects = []
  
  // Generate positions based on arrangement type
  switch (arrangement) {
    case 'line':
      for (let i = 0; i < numObjects; i++) {
        objects.push({
          x: 20 + (i * 60 / Math.max(1, numObjects - 1)),
          y: 50 + (Math.random() - 0.5) * 10,
          color: colors[Math.floor(Math.random() * colors.length)],
          shape: shapes[Math.floor(Math.random() * shapes.length)]
        })
      }
      break
      
    case 'circle':
      const radius = 25
      const centerX = 50
      const centerY = 50
      for (let i = 0; i < numObjects; i++) {
        const angle = (i * 2 * Math.PI) / numObjects
        objects.push({
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
          color: colors[Math.floor(Math.random() * colors.length)],
          shape: shapes[Math.floor(Math.random() * shapes.length)]
        })
      }
      break
      
    case 'dice_pattern':
      const dicePatterns: { [key: number]: Array<{x: number, y: number}> } = {
        1: [{x: 50, y: 50}],
        2: [{x: 30, y: 30}, {x: 70, y: 70}],
        3: [{x: 30, y: 30}, {x: 50, y: 50}, {x: 70, y: 70}],
        4: [{x: 30, y: 30}, {x: 70, y: 30}, {x: 30, y: 70}, {x: 70, y: 70}],
        5: [{x: 30, y: 30}, {x: 70, y: 30}, {x: 50, y: 50}, {x: 30, y: 70}, {x: 70, y: 70}],
        6: [{x: 30, y: 25}, {x: 70, y: 25}, {x: 30, y: 50}, {x: 70, y: 50}, {x: 30, y: 75}, {x: 70, y: 75}]
      }
      
      const pattern = dicePatterns[Math.min(numObjects, 6)] || dicePatterns[1]
      pattern.forEach((pos, i) => {
        if (i < numObjects) {
          objects.push({
            x: pos.x,
            y: pos.y,
            color: colors[Math.floor(Math.random() * colors.length)],
            shape: shapes[Math.floor(Math.random() * shapes.length)]
          })
        }
      })
      break
      
    default: // random
      const usedPositions = new Set()
      for (let i = 0; i < numObjects; i++) {
        let x, y, posKey
        let attempts = 0
        
        do {
          x = Math.floor(Math.random() * 8) + 1
          y = Math.floor(Math.random() * 6) + 1
          posKey = `${x}-${y}`
          attempts++
        } while (usedPositions.has(posKey) && attempts < 20)
        
        if (attempts < 20) {
          usedPositions.add(posKey)
          objects.push({
            x: x * 10 + Math.random() * 5,
            y: y * 10 + Math.random() * 5,
            color: colors[Math.floor(Math.random() * colors.length)],
            shape: shapes[Math.floor(Math.random() * shapes.length)]
          })
        }
      }
  }

  return {
    objects,
    correctAnswer: objects.length,
    difficulty: Math.ceil(objects.length / 2),
    timeLimit: timeLimit || 3000
  }
}

function generateFallbackPattern(userAge: number, difficulty: number, questionNumber: number): SubitizingPattern {
  // For 5-6 year olds, use range 3-7 objects
  const minObjects = 3
  const maxObjects = userAge >= 5 && userAge <= 6 ? 7 : (userAge >= 6 ? Math.min(5, 2 + Math.floor(questionNumber / 3)) : Math.min(4, 2 + Math.floor(questionNumber / 4)))
  const numObjects = Math.floor(Math.random() * (maxObjects - minObjects + 1)) + minObjects
  const timeLimit = userAge >= 6 ? Math.max(2000, 4000 - (questionNumber * 100)) : Math.max(2500, 4500 - (questionNumber * 100))
  
  const shapes = ['circle', 'square', 'triangle', 'star', 'heart']
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']
  
  const objects = []
  const usedPositions = new Set()
  
  for (let i = 0; i < numObjects; i++) {
    let x, y, posKey
    let attempts = 0
    
    do {
      x = Math.floor(Math.random() * 8) + 1
      y = Math.floor(Math.random() * 6) + 1
      posKey = `${x}-${y}`
      attempts++
    } while (usedPositions.has(posKey) && attempts < 20)
    
    if (attempts < 20) {
      usedPositions.add(posKey)
      objects.push({
        x: x * 10 + Math.random() * 5,
        y: y * 10 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: shapes[Math.floor(Math.random() * shapes.length)]
      })
    }
  }

  return {
    objects,
    correctAnswer: objects.length,
    difficulty: Math.ceil(objects.length / 2),
    timeLimit,
    educationalTip: 'Look quickly and trust your first instinct!',
    encouragement: 'You\'re doing great! Keep practicing!'
  }
}