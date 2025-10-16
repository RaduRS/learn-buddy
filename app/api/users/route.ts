import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

// GET /api/users - Get all users
export async function GET() {
  try {
    const users = await DatabaseService.getAllUsers()
    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// POST /api/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, avatar, age, parentEmail } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const user = await DatabaseService.createUser({
      name,
      avatar,
      age: age ? parseInt(age) : undefined,
      parentEmail,
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}