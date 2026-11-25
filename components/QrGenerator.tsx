"use client";

import { useEffect, useRef, useState } from "react";
import type QRCodeStyling from "qr-code-styling";
import type { Options } from "qr-code-styling";
import { AlertTriangle, ArrowLeftRight, ArrowRight, Download, Info, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ColorField } from "@/components/color-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type DotStyle = "square" | "rounded" | "dots" | "classy-rounded" | "extra-rounded";
type FrameStyle = "none" | "box" | "label";
type Ext = "png" | "svg" | "webp";

const PLACEHOLDER = "https://example.com";

// Frame geometry, as fractions of the QR export size.
const PAD = 0.06;
const LABEL_H = 0.16;
const RADIUS = 0.07;
const INNER_RADIUS = 0.04;

function normalizeUrl(input: string): string {
  const t = input.trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

function validateUrl(input: string): string | null {
  const n = normalizeUrl(input);
  if (!n) return null;
  try {
    const u = new URL(n);
    if (!u.hostname.includes(".") && u.hostname !== "localhost") return null;
    return n;
  } catch {
    return null;
  }
}

function contrastText(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#111827" : "#ffffff";
}

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const ch = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function saveBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function buildOptions(o: {
  data: string;
  size: number;
  fg: string;
  bg: string;
  dots: DotStyle;
  logo: string | null;
}): Options {
  return {
    width: o.size,
    height: o.size,
    type: "canvas",
    data: o.data,
    margin: 16,
    qrOptions: { errorCorrectionLevel: o.logo ? "H" : "M" },
    dotsOptions: { color: o.fg, type: o.dots },
    cornersSquareOptions: { color: o.fg },
    backgroundOptions: { color: o.bg },
    image: o.logo ?? undefined,
    imageOptions: { margin: 6, imageSize: 0.3, crossOrigin: "anonymous" },
  };
}

export default function QrGenerator() {
  const [step, setStep] = useState<"url" | "style">("url");
  const [draft, setDraft] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fg, setFg] = useState("#111827");
  const [bg, setBg] = useState("#ffffff");
  const [dots, setDots] = useState<DotStyle>("rounded");
  const [size, setSize] = useState(1024);
  const [logo, setLogo] = useState<string | null>(null);
  const [frame, setFrame] = useState<FrameStyle>("box");
  const [frameColor, setFrameColor] = useState("#ffffff");
  const [label, setLabel] = useState("");
  const [ready, setReady] = useState(false);

  const boxRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);

  const data = normalizeUrl(url);
  const hasData = data.length > 0;
  const current = { data: hasData ? data : PLACEHOLDER, size, fg, bg, dots, logo };
  const textColor = contrastText(frameColor);
  const ratio = contrastRatio(fg, bg);
  const lowContrast = ratio < 3;
  const inverted = !lowContrast && luminance(fg) > luminance(bg);
  const showLabel = frame === "label" && label.trim().length > 0;

  // Create the QR instance once, client-side only.
  useEffect(() => {
    let cancelled = false;
    import("qr-code-styling").then(({ default: QRCodeStyling }) => {
      if (cancelled || !boxRef.current) return;
      const qr = new QRCodeStyling(buildOptions(current));
      qr.append(boxRef.current);
      qrRef.current = qr;
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render the code whenever an option changes.
  useEffect(() => {
    if (!ready || !qrRef.current) return;
    qrRef.current.update(buildOptions(current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, data, size, fg, bg, dots, logo]);

  function submitUrl(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    const valid = validateUrl(draft);
    if (!valid) {
      setError("Please enter a valid link, like yourwebsite.com");
      return;
    }
    setError("");
    setLoading(true);
    setUrl(valid);
    setTimeout(() => {
      setLoading(false);
      setStep("style");
    }, 800);
  }

  function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function download(ext: Ext) {
    const qr = qrRef.current;
    if (!qr) return;

    if (frame === "none") {
      await qr.download({ name: "qr-code", extension: ext });
      return;
    }

    const pad = Math.round(size * PAD);
    const labelH = showLabel ? Math.round(size * LABEL_H) : 0;
    const radius = Math.round(size * RADIUS);
    const innerRadius = Math.round(size * INNER_RADIUS);
    const W = size + pad * 2;
    const H = size + pad * 2 + labelH;
    const text = label.trim().slice(0, 24);

    if (ext === "svg") {
      const raw = (await qr.getRawData("svg")) as Blob | null;
      if (!raw) return;
      const inner = (await raw.text()).replace(/<\?xml[^>]*\?>/, "").trim();
      const nested = inner.replace(/<svg\b/, `<svg x="${pad}" y="${pad}"`);
      const labelSvg = showLabel
        ? `<text x="${W / 2}" y="${pad + size + labelH / 2}" text-anchor="middle" dominant-baseline="central" font-family="system-ui,Arial,sans-serif" font-weight="700" font-size="${Math.round(
            labelH * 0.42
          )}" letter-spacing="${Math.round(labelH * 0.04)}" fill="${textColor}">${escapeXml(text)}</text>`
        : "";
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><clipPath id="qrclip"><rect x="${pad}" y="${pad}" width="${size}" height="${size}" rx="${innerRadius}"/></clipPath></defs><rect width="${W}" height="${H}" rx="${radius}" fill="${frameColor}"/><g clip-path="url(#qrclip)">${nested}</g>${labelSvg}</svg>`;
      saveBlob(new Blob([svg], { type: "image/svg+xml" }), "qr-code.svg");
      return;
    }

    const png = (await qr.getRawData("png")) as Blob | null;
    if (!png) return;
    const img = new Image();
    const src = URL.createObjectURL(png);
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("Could not load QR image"));
      img.src = src;
    });

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = frameColor;
    ctx.beginPath();
    ctx.roundRect(0, 0, W, H, radius);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(pad, pad, size, size, innerRadius);
    ctx.clip();
    ctx.drawImage(img, pad, pad, size, size);
    ctx.restore();
    URL.revokeObjectURL(src);

    if (showLabel) {
      ctx.fillStyle = textColor;
      ctx.font = `700 ${Math.round(labelH * 0.42)}px system-ui, Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, W / 2, pad + size + labelH / 2);
    }

    const mime = ext === "webp" ? "image/webp" : "image/png";
    canvas.toBlob((b) => b && saveBlob(b, `qr-code.${ext}`), mime, 0.95);
  }



  const section = "text-xs font-medium uppercase tracking-wide text-muted-foreground";

  return (
    <>
      {/* Step 1: link */}
      <div
        className={
          step === "url"
            ? "mx-auto flex max-w-2xl flex-col items-center gap-8 pt-12 text-center sm:pt-24"
            : "hidden"
        }
      >
        <div className="space-y-3">
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Turn any link into a QR code
          </h1>
          <p className="text-muted-foreground">Paste a link, style it, download it.</p>
        </div>
        <form onSubmit={submitUrl} className="w-full max-w-xl space-y-3 text-left">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="text"
              inputMode="url"
              placeholder="https://yourwebsite.com"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                if (error) setError("");
              }}
              className="h-11 flex-1 bg-white text-base"
              disabled={loading}
              autoFocus
            />
            <Button type="submit" size="lg" disabled={!draft.trim() || loading} className="min-w-36">
              {loading ? (
                <>
                  <Loader2 className="animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  Generate
                  <ArrowRight />
                </>
              )}
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
        <p className="text-xs text-muted-foreground">Free · No sign-up · Runs in your browser</p>
      </div>

      {/* Step 2: style + download */}
      <div className={step === "style" ? "grid gap-6 lg:grid-cols-[1fr_380px]" : "hidden"}>
        <Card>
          <CardContent className="space-y-7">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className={section}>Link</p>
                <p className="mt-1 truncate font-medium" title={url}>
                  {url}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDraft(url);
                  setStep("url");
                }}
              >
                Change
              </Button>
            </div>

            <div className="space-y-4 border-t pt-6">
              <p className={section}>Colors</p>
              <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                <ColorField id="fg" label="Code" value={fg} onChange={setFg} />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Swap colors"
                  title="Swap colors"
                  onClick={() => {
                    setFg(bg);
                    setBg(fg);
                  }}
                >
                  <ArrowLeftRight />
                </Button>
                <ColorField id="bg" label="Background" value={bg} onChange={setBg} />
              </div>
              {lowContrast && (
                <Alert variant="destructive">
                  <AlertTriangle />
                  <AlertDescription>
                    Code and background are too similar to scan. Use stronger contrast, such as a
                    dark code on a light background.
                  </AlertDescription>
                </Alert>
              )}
              {inverted && (
                <Alert variant="warning">
                  <Info />
                  <AlertDescription>
                    Light code on a dark background works on most modern phones, but some older
                    scanners can&apos;t read it. Test before printing.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-4 border-t pt-6">
              <p className={section}>Style</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Dot style</Label>
                  <Select value={dots} onValueChange={(v) => setDots(v as DotStyle)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="square">Square</SelectItem>
                      <SelectItem value="rounded">Rounded</SelectItem>
                      <SelectItem value="extra-rounded">Extra rounded</SelectItem>
                      <SelectItem value="classy-rounded">Classy</SelectItem>
                      <SelectItem value="dots">Dots</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Export size</Label>
                  <Select value={String(size)} onValueChange={(v) => setSize(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="512">512 px</SelectItem>
                      <SelectItem value="1024">1024 px</SelectItem>
                      <SelectItem value="2048">2048 px</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo">Logo (optional)</Label>
                <div className="flex items-center gap-2">
                  <Input id="logo" type="file" accept="image/*" onChange={onLogo} />
                  {logo && (
                    <Button variant="ghost" size="sm" onClick={() => setLogo(null)}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4 border-t pt-6">
              <p className={section}>Frame</p>
              <ToggleGroup
                type="single"
                value={frame}
                onValueChange={(v) => v && setFrame(v as FrameStyle)}
              >
                <ToggleGroupItem value="none">None</ToggleGroupItem>
                <ToggleGroupItem value="box">Box</ToggleGroupItem>
                <ToggleGroupItem value="label">Box + label</ToggleGroupItem>
              </ToggleGroup>
              {frame !== "none" && (
                <div className="grid grid-cols-2 gap-4">
                  <ColorField id="frameColor" label="Frame color" value={frameColor} onChange={setFrameColor} />
                  {frame === "label" && (
                    <div className="space-y-2">
                      <Label htmlFor="frameText">Frame text</Label>
                      <Input
                        id="frameText"
                        maxLength={24}
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder="Optional text"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/30 shadow-none lg:sticky lg:top-6 lg:self-start">
          <CardContent className="space-y-5">
            <div className="frame-wrap">
              <div
                className={frame === "none" ? "frame none" : "frame"}
                style={frame === "none" ? undefined : { background: frameColor }}
              >
                <div ref={boxRef} className="qr" />
                {showLabel && (
                  <div className="frame-label" style={{ color: textColor }}>
                    {label.trim().slice(0, 24)}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Button
                className="w-full"
                size="lg"
                disabled={!hasData || lowContrast}
                onClick={() => download("png")}
              >
                <Download />
                Download PNG
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" disabled={!hasData || lowContrast} onClick={() => download("svg")}>
                  SVG
                </Button>
                <Button variant="outline" disabled={!hasData || lowContrast} onClick={() => download("webp")}>
                  WebP
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
