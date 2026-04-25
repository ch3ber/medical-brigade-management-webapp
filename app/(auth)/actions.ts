'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/shared/supabase/server'

function loginErrorCode(message: string): string {
  if (message.includes('Invalid login credentials')) return 'invalid_credentials'
  if (message.includes('Email not confirmed')) return 'email_not_confirmed'
  return 'login_failed'
}

function registerErrorCode(message: string): string {
  if (message.includes('User already registered')) return 'user_already_registered'
  if (message.includes('Password should be at least')) return 'weak_password'
  if (message.includes('valid password')) return 'weak_password'
  return 'register_failed'
}

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/login?error=${loginErrorCode(error.message)}`)
  }

  redirect('/dashboard')
}

export async function registerAction(formData: FormData) {
  const fullName = formData.get('fullName') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (password !== confirmPassword) {
    redirect('/register?error=passwords_mismatch')
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  })

  if (error) {
    redirect(`/register?error=${registerErrorCode(error.message)}`)
  }

  if (!data?.session) {
    redirect('/login?message=email_confirmation_required')
  }

  redirect('/dashboard')
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut({ scope: 'local' })
  redirect('/login')
}
