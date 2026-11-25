import { QrCode } from "lucide-react";
import HeroDots from "@/components/HeroDots";
import QrGenerator from "@/components/QrGenerator";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <HeroDots />
      <div aria-hidden className="hero-glow" />
      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-5">
      <header className="flex h-16 items-center">
        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <QrCode className="size-4" />
          </span>
          Qrly
        </div>
      </header>
      <main className="flex-1 py-6">
        <QrGenerator />
      </main>
      <footer className="py-8 text-center text-xs text-muted-foreground">
        Codes are generated in your browser. Nothing you type is uploaded.
      </footer>
      </div>
    </div>
  );
}
