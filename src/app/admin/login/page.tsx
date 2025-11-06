import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ logout?: string; error?: string }>
}) {
  // Check if ADMIN_TOKEN is set
  const adminToken = process.env.ADMIN_TOKEN

  // If no ADMIN_TOKEN, redirect to admin (it's open)
  if (!adminToken) {
    redirect('/admin')
  }

  const params = await searchParams
  const cs = await cookies()

  // Handle logout
  if (params.logout === '1') {
    cs.delete('admin')
    // Continue to show login page after logout
  } else {
    // Check if already logged in
    const auth = cs.get('admin')?.value
    if (auth === adminToken) {
      redirect('/admin')
    }
  }

  const hasError = params.error === '1'
  const justLoggedOut = params.logout === '1'

  async function handleLogin(formData: FormData) {
    'use server'
    const token = formData.get('token')?.toString()
    const adminToken = process.env.ADMIN_TOKEN

    if (token && adminToken && token === adminToken) {
      const cs = await cookies()
      cs.set('admin', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      })
      redirect('/admin')
    }

    // Wrong token, redirect back with error
    redirect('/admin/login?error=1')
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Login</h1>
          <p className="text-white/70">Enter your admin token to continue</p>
        </div>

        {justLoggedOut && (
          <div className="mb-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="text-sm text-green-200">Logged out successfully</p>
          </div>
        )}

        {hasError && (
          <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-200">Invalid token. Please try again.</p>
          </div>
        )}

        <form action={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="token" className="block text-sm font-medium mb-2">
              Admin Token
            </label>
            <input
              type="password"
              id="token"
              name="token"
              required
              className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/10 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
              placeholder="Enter your ADMIN_TOKEN"
            />
          </div>

          <button
            type="submit"
            className="w-full px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
          >
            Login
          </button>
        </form>

        <div className="mt-6 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <p className="text-sm text-yellow-200/90">
            <strong>Tip:</strong> Your ADMIN_TOKEN is set as an environment variable.
            Check your <code className="bg-black/30 px-1 rounded">.env</code> file or deployment settings.
          </p>
        </div>

        <div className="mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-sm text-blue-200/90">
            <strong>Remove protection:</strong> To make /admin public, remove or unset the
            <code className="bg-black/30 px-1 rounded mx-1">ADMIN_TOKEN</code> environment variable.
          </p>
        </div>
      </div>
    </main>
  )
}
