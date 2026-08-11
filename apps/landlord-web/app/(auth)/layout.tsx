export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <h5 className="mb-6 text-center font-mono text-2xl font-medium">Villuh</h5>
        {children}
      </div>
    </main>
  )
}
