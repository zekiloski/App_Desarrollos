// Pantallas que se abren al escanear el QR de una etiqueta: funcionan sin iniciar sesión.
export default function LayoutPublico({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-dvh max-w-2xl space-y-4 p-4 sm:p-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Oncativo S.A." className="h-10 w-auto rounded-md bg-white p-0.5" />
      {children}
    </main>
  );
}
