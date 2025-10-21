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
    size: 'small' | 'medium' | 'large'
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
  "numObjects": number (MUST be between 5-12 inclusive, use Math.floor(Math.random() * 8) + 5),
  "arrangement": "random" | "line" | "circle" | "square" | "triangle" | "dice_pattern",
  "educationalTip": "brief tip about subitizing or number recognition",
  "encouragement": "age-appropriate encouraging message",
  "timeLimit": number (milliseconds, 2500-3500 based on difficulty)
}

CRITICAL: The numObjects MUST be a random number between 5 and 12 (inclusive). Do not bias towards higher or lower numbers. Each number from 5-12 should have equal probability.

Guidelines:
- Use TRUE RANDOM between 5-12 objects (equal probability for each number)
- Time limits should be 2500-3500ms
- Use varied arrangements for visual interest
- Objects should have different sizes (small, medium, large) and different shapes for visual variety

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
      
      // ALWAYS override AI's numObjects with our own random generation for true randomness
      aiData.numObjects = Math.floor(Math.random() * 8) + 5 // Force 5-12 range
      console.log('AI generated data, but overrode numObjects to:', aiData.numObjects)
      
      console.log('Final AI data:', aiData)
    } catch (error) {
      console.error('Failed to parse AI response:', aiResponse)
      // Fallback to default pattern with 5-12 range
      const minObjects = 5
      const maxObjects = 12
      const numObjects = Math.floor(Math.random() * (maxObjects - minObjects + 1)) + minObjects
      
      aiData = {
        numObjects: numObjects,
        arrangement: 'random',
        educationalTip: 'Look at the objects quickly and trust your first instinct!',
        encouragement: 'You\'re doing great! Keep practicing!',
        timeLimit: 3000
      }
      console.log('Using fallback pattern with', numObjects, 'objects for age', userAge)
    }

    // Generate the actual pattern based on AI recommendations
    const pattern = generatePattern(aiData)
    console.log('Generated pattern with', pattern.objects.length, 'objects using AI data')

    return NextResponse.json({
      ...pattern,
      educationalTip: aiData.educationalTip,
      encouragement: aiData.encouragement
    })

  } catch (error) {
    console.error('Error generating subitizing pattern:', error)
    
    // Fallback pattern generation
    const fallbackPattern = generateFallbackPattern(userAge, difficulty, questionNumber)
    console.log('Using complete fallback pattern with', fallbackPattern.objects.length, 'objects for age', userAge)
    
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
  const sizes = ['small', 'medium', 'large'] as const
  
  const objects = []
  
  // Generate positions based on arrangement type
  switch (arrangement) {
    case 'line':
      for (let i = 0; i < numObjects; i++) {
        objects.push({
          x: 20 + (i * 60 / Math.max(1, numObjects - 1)),
          y: 50 + (Math.random() - 0.5) * 10,
          color: colors[Math.floor(Math.random() * colors.length)],
          shape: shapes[Math.floor(Math.random() * shapes.length)],
          size: sizes[Math.floor(Math.random() * sizes.length)]
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
          shape: shapes[Math.floor(Math.random() * shapes.length)],
          size: sizes[Math.floor(Math.random() * sizes.length)]
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
        6: [{x: 30, y: 25}, {x: 70, y: 25}, {x: 30, y: 50}, {x: 70, y: 50}, {x: 30, y: 75}, {x: 70, y: 75}],
        7: [{x: 20, y: 20}, {x: 50, y: 20}, {x: 80, y: 20}, {x: 35, y: 50}, {x: 65, y: 50}, {x: 20, y: 80}, {x: 80, y: 80}],
        8: [{x: 25, y: 20}, {x: 50, y: 20}, {x: 75, y: 20}, {x: 25, y: 50}, {x: 75, y: 50}, {x: 25, y: 80}, {x: 50, y: 80}, {x: 75, y: 80}],
        9: [{x: 20, y: 15}, {x: 50, y: 15}, {x: 80, y: 15}, {x: 20, y: 45}, {x: 50, y: 45}, {x: 80, y: 45}, {x: 20, y: 75}, {x: 50, y: 75}, {x: 80, y: 75}],
        10: [{x: 15, y: 15}, {x: 35, y: 15}, {x: 55, y: 15}, {x: 75, y: 15}, {x: 25, y: 40}, {x: 65, y: 40}, {x: 15, y: 65}, {x: 35, y: 65}, {x: 55, y: 65}, {x: 75, y: 65}],
        11: [{x: 10, y: 10}, {x: 30, y: 10}, {x: 50, y: 10}, {x: 70, y: 10}, {x: 90, y: 10}, {x: 20, y: 40}, {x: 40, y: 40}, {x: 60, y: 40}, {x: 80, y: 40}, {x: 25, y: 70}, {x: 75, y: 70}],
        12: [{x: 10, y: 10}, {x: 30, y: 10}, {x: 50, y: 10}, {x: 70, y: 10}, {x: 90, y: 10}, {x: 10, y: 40}, {x: 30, y: 40}, {x: 50, y: 40}, {x: 70, y: 40}, {x: 90, y: 40}, {x: 30, y: 70}, {x: 70, y: 70}]
      }
      
      // For numbers > 12, fall back to random arrangement
      if (numObjects > 12) {
        // Fall back to random arrangement for very high numbers
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
              shape: shapes[Math.floor(Math.random() * shapes.length)],
              size: sizes[Math.floor(Math.random() * sizes.length)]
            })
          }
        }
      } else {
        const pattern = dicePatterns[numObjects] || dicePatterns[6]
        pattern.forEach((pos, i) => {
          if (i < numObjects) {
            objects.push({
              x: pos.x,
              y: pos.y,
              color: colors[Math.floor(Math.random() * colors.length)],
              shape: shapes[Math.floor(Math.random() * shapes.length)],
              size: sizes[Math.floor(Math.random() * sizes.length)]
            })
          }
        })
      }
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
            shape: shapes[Math.floor(Math.random() * shapes.length)],
            size: sizes[Math.floor(Math.random() * sizes.length)]
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
  // Always use range 5-12 objects for true randomness
  const minObjects = 5
  const maxObjects = 12
  const numObjects = Math.floor(Math.random() * (maxObjects - minObjects + 1)) + minObjects
  const timeLimit = Math.max(2500, 4000 - (questionNumber * 100))
  
  const shapes = ['circle', 'square', 'triangle', 'star', 'heart']
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']
  const sizes = ['small', 'medium', 'large'] as const
  
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
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        size: sizes[Math.floor(Math.random() * sizes.length)]
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