import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'

import { LogoMark } from '@/components/brand/logo'
import { queryClient } from '@/lib/query-client'
import { RedirectIfAuthenticated, RequireAuth } from '@/routes/guards'

const LoginPage = lazy(() => import('@/features/auth/pages/login-page'))
const ChatPage = lazy(() => import('@/features/chat/pages/chat-page'))

function BootScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas">
      <div className="grid size-16 animate-[pop_0.3s_ease-out] place-items-center rounded-3xl bg-white shadow-soft ring-1 ring-line">
        <LogoMark className="h-8" />
      </div>
      <p className="text-[12.5px] font-medium text-ink-500">Cargando Nexlang Chat…</p>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<BootScreen />}>
          <Routes>
          <Route
            path="/login"
            element={
              <RedirectIfAuthenticated>
                <LoginPage />
              </RedirectIfAuthenticated>
            }
          />
          <Route
            path="/"
            element={
              <RequireAuth>
                <ChatPage />
              </RequireAuth>
            }
          />
          <Route
            path="/c/:conversationId"
            element={
              <RequireAuth>
                <ChatPage />
              </RequireAuth>
            }
          />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>

      <Toaster
        position="top-right"
        closeButton
        richColors
        toastOptions={{
          classNames: {
            toast: '!rounded-2xl !border-line !shadow-soft !text-[13px]',
            title: '!font-semibold',
            description: '!text-[12px]',
          },
        }}
      />

      {import.meta.env.DEV ? (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      ) : null}
    </QueryClientProvider>
  )
}
