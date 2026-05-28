import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { isAdminRole } from '@/lib/admin-auth'
import { runWhatsappAutomation } from '@/lib/whatsapp-automation-runner'

export const runtime = 'nodejs'

async function canRunAutomation(req: Request) {
  const session = await auth()
  if (session?.user && isAdminRole(session.user.role)) return true

  const secret = process.env.WHATSAPP_AUTOMATION_SECRET
  if (!secret) return false

  const authorization = req.headers.get('authorization') || ''
  return authorization === `Bearer ${secret}`
}

export async function POST(req: Request) {
  if (!(await canRunAutomation(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  const result = await runWhatsappAutomation(Number(body.limit || 25))
  return NextResponse.json(result)
}
