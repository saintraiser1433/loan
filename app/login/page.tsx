import { Landmark } from "lucide-react"

import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="/" className="flex items-center gap-2 font-medium">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex size-8 items-center justify-center rounded-lg shadow-md">
              <Landmark className="size-4" />
            </div>
            <span className="font-semibold">GCCI Lending</span>
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 relative hidden lg:block">
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="space-y-6 text-center">
            <div className="bg-white/10 backdrop-blur-sm text-white flex size-20 items-center justify-center rounded-2xl mx-auto shadow-2xl border border-white/20">
              <Landmark className="size-10" />
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-bold text-white">Glan Credible and Capital Inc.</h2>
              <p className="text-emerald-100 text-lg">
                Online Lending Management System
              </p>
              <p className="text-emerald-200/70 text-sm max-w-md mx-auto">
                Your trusted partner for fast, reliable, and transparent lending services
              </p>
            </div>
          </div>
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/20 to-transparent" />
      </div>
    </div>
  )
}
