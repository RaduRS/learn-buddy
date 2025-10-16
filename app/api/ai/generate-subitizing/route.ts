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
  "numObjects": number (5-10 for age 5-6, 3-8 for age 7+),
  "arrangement": "random" | "line" | "circle" | "square" | "triangle" | "dice_pattern",
  "educationalTip": "brief tip about subitizing or number recognition",
  "encouragement": "age-appropriate encouraging message",
  "timeLimit": number (milliseconds, 3000-5000 based on difficulty)
}

Guidelines:
- For younger children (5-6): Use 5-10 objects, longer time limits (2000-3000ms), simpler arrangements
- For older children (7+): Use 3-8 objects, shorter time limits (1000-2000ms), more complex arrangements
- Objects should have different sizes (small, medium, large) and different shapes for visual variety
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
      console.log('AI generated data:', aiData)
    } catch (error) {
      console.error('Failed to parse AI response:', aiResponse)
      // Fallback to default pattern with correct ranges
      const minObjects = userAge >= 5 && userAge <= 6 ? 5 : 3
      const maxObjects = userAge >= 5 && userAge <= 6 ? 10 : 8
      const numObjects = Math.floor(Math.random() * (maxObjects - minObjects + 1)) + minObjects
      
      aiData = {
        numObjects: numObjects,
        arrangement: 'random',
        educationalTip: 'Look at the objects quickly and trust your first instinct!',
        encouragement: 'You\'re doing great! Keep practicing!',
        timeLimit: userAge >= 5 && userAge <= 6 ? 4000 : 3000
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
        10: [{x: 15, y: 15}, {x: 35, y: 15}, {x: 55, y: 15}, {x: 75, y: 15}, {x: 25, y: 40}, {x: 65, y: 40}, {x: 15, y: 65}, {x: 35, y: 65}, {x: 55, y: 65}, {x: 75, y: 65}]
      }
      
      // For numbers > 10, fall back to random arrangement
      if (numObjects > 10) {
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
  // For 5-6 year olds, use range 5-10 objects
  const minObjects = userAge >= 5 && userAge <= 6 ? 5 : 3
  const maxObjects = userAge >= 5 && userAge <= 6 ? 10 : (userAge >= 7 ? Math.min(8, 3 + Math.floor(questionNumber / 3)) : Math.min(6, 2 + Math.floor(questionNumber / 4)))
  const numObjects = Math.floor(Math.random() * (maxObjects - minObjects + 1)) + minObjects
  const timeLimit = userAge >= 5 && userAge <= 6 ? Math.max(3000, 5000 - (questionNumber * 100)) : Math.max(2000, 4000 - (questionNumber * 100))
  
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