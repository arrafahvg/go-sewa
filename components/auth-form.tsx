'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export default function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setLoading(true)
    const data = new FormData(event.currentTarget)
    const result = mode === 'sign-up' ? await authClient.signUp.email({ name: String(data.get('name')), email: String(data.get('email')), password: String(data.get('password')) }) : await authClient.signIn.email({ email: String(data.get('email')), password: String(data.get('password')) })
    setLoading(false)
    if (result.error) { setError('We could not complete that request. Check your details and try again.'); return }
    router.push('/'); router.refresh()
  }
  return <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-[#173b3b]/10 bg-white/80 p-7 shadow-xl shadow-[#173b3b]/5 backdrop-blur"><p className="font-serif text-2xl font-bold">go<span className="text-[#e76f51]">—</span>sewa</p><h1 className="mt-8 font-serif text-4xl font-bold">{mode === 'sign-in' ? 'Welcome back.' : 'Create your account.'}</h1><p className="mt-3 text-sm leading-6 text-[#173b3b]/60">{mode === 'sign-in' ? 'Sign in to manage bookings and rental details.' : 'Save your details for a smoother rental experience.'}</p>{mode === 'sign-up' && <label className="mt-7 block text-sm font-semibold">Name<input name="name" required className="mt-2 w-full rounded-xl border border-[#173b3b]/15 bg-transparent px-4 py-3 outline-none focus:border-[#e76f51]" /></label>}<label className="mt-5 block text-sm font-semibold">Email<input name="email" type="email" required className="mt-2 w-full rounded-xl border border-[#173b3b]/15 bg-transparent px-4 py-3 outline-none focus:border-[#e76f51]" /></label><label className="mt-5 block text-sm font-semibold">Password<input name="password" type="password" minLength={8} required className="mt-2 w-full rounded-xl border border-[#173b3b]/15 bg-transparent px-4 py-3 outline-none focus:border-[#e76f51]" /></label>{error && <p role="alert" className="mt-4 text-sm font-semibold text-[#a43d2b]">{error}</p>}<button disabled={loading} className="mt-7 w-full rounded-full bg-[#e76f51] px-5 py-3.5 text-sm font-bold text-white disabled:opacity-60">{loading ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}</button><a href={mode === 'sign-in' ? '/sign-up' : '/sign-in'} className="mt-5 block text-center text-sm font-semibold text-[#387066]">{mode === 'sign-in' ? 'New to Go-Sewa? Create an account' : 'Already have an account? Sign in'}</a></form>
}
