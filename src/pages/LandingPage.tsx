import { useState, useEffect, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  Upload,
  Scan,
  Download,
  Layers,
  Image,
  Palette,
  ChevronDown,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Shield,
} from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button.tsx'
import heroBg from '@/assets/CookedBg.png'
import partyGridLogo from '@/assets/PartyGrid.png'
import demoVideo from '@/assets/HotIconDemoVid.mp4'
import { cn } from '@/lib/utils.ts' 

/* ------------------------------------------------------------------ */
/*  Nav                                                               */
/* ------------------------------------------------------------------ */
function Nav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <img src={partyGridLogo} alt="Party Grid" className="h-8 w-auto" />
          IconMaker
        </Link>
        <Link to="/app" className={buttonVariants({ size: 'sm' })}>
          Launch App <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </div>
    </nav>
  )
}

/* ------------------------------------------------------------------ */
/*  Hero                                                              */
/* ------------------------------------------------------------------ */
function Hero() {
  return (
    <section
      className="relative bg-cover bg-center px-6 pb-24 pt-20 text-center"
      style={{ backgroundImage: `url(${heroBg})` }}
    >
      <div className="absolute inset-0 bg-background/80" />
      <div className="relative mx-auto max-w-4xl">
      <h1 className="text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl">
        Extract Icons from Any&nbsp;Image
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
        The fastest way to pull individual icons from sprite sheets, screenshots,
        and design files. AI-powered detection, transparent backgrounds, one-click
        export.
      </p>
      <div className="mt-10 flex items-center justify-center gap-4">
        <Link to="/app" className={buttonVariants({ size: 'lg' })}>
          Launch App <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
        <a href="#waitlist" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
          Join the Waitlist
        </a>
      </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Demo Video                                                        */
/* ------------------------------------------------------------------ */
function DemoVideo() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-24 text-center">
      <h2 className="text-3xl font-bold">See It in Action</h2>
      <div className="mt-10 overflow-hidden rounded-xl border border-border/60 bg-muted shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border/40 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-yellow-400" />
          <span className="h-3 w-3 rounded-full bg-green-400" />
          <span className="flex-1 text-center text-xs font-medium text-muted-foreground">
            IconMaker
          </span>
        </div>
        <video
          src={demoVideo}
          autoPlay
          muted
          loop
          playsInline
          className="w-full"
        />
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Social Proof (feature stats)                                      */
/* ------------------------------------------------------------------ */
const stats = [
  { value: '3 formats', label: 'PNG, JPEG, and WebP supported' },
  { value: '< 5 seconds', label: 'Average detection time' },
  { value: 'Up to 2048px', label: 'Export at any size' },
  { value: '100% private', label: 'Images never leave your browser' },
]

function SocialProof() {
  return (
    <section className="border-y border-border/40 bg-muted/30 py-16">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.value} className="text-center">
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  How It Works                                                      */
/* ------------------------------------------------------------------ */
const steps = [
  { icon: Upload, title: 'Upload your image', desc: 'Drag & drop or browse. Supports PNG, JPEG, and WebP.' },
  { icon: Scan, title: 'Detect icons', desc: 'AI-powered contour detection finds every icon automatically.' },
  { icon: Download, title: 'Export as PNG', desc: 'Download individual icons or a batch ZIP with one click.' },
]

function HowItWorks() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <h2 className="text-center text-3xl font-bold">How It Works</h2>
      <div className="mt-14 grid gap-10 sm:grid-cols-3">
        {steps.map((s, i) => (
          <div key={s.title} className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <s.icon className="h-7 w-7" />
            </div>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Step {i + 1}
            </p>
            <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Features                                                          */
/* ------------------------------------------------------------------ */
const features = [
  { icon: Sparkles, title: 'AI-powered detection', desc: 'Contour-based detection automatically finds and outlines every icon in your image.' },
  { icon: Layers, title: 'Background removal', desc: 'Export icons with transparent backgrounds, ready to use in any project.' },
  { icon: Download, title: 'Batch export', desc: 'Download all detected icons as a ZIP archive with a single click.' },
  { icon: Image, title: 'Custom sizing', desc: 'Export icons at any size up to 2048px. Original dimensions are preserved by default.' },
  { icon: Palette, title: 'Adjustable sensitivity', desc: 'Fine-tune detection sensitivity to catch every icon, even in complex images.' },
  { icon: Shield, title: 'Privacy first', desc: 'All processing happens in your browser. Your images are never uploaded to any server.' },
]

function Features() {
  return (
    <section className="border-t border-border/40 bg-muted/30 py-24">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-center text-3xl font-bold">Features</h2>
        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-border/60 bg-background p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  FAQ                                                               */
/* ------------------------------------------------------------------ */
const faqs = [
  {
    q: 'What image formats are supported?',
    a: 'IconMaker supports PNG, JPEG, and WebP images. For best results, use high-contrast images with clearly defined icons.',
  },
  {
    q: 'How does icon detection work?',
    a: 'IconMaker uses OpenCV-powered contour detection running entirely in your browser. It identifies distinct shapes and regions in your image and outlines each one as an individual icon.',
  },
  {
    q: 'Is my data private?',
    a: 'Yes. All processing happens locally in your browser using WebAssembly. Your images are never uploaded to any server, and no data leaves your device.',
  },
  {
    q: 'Can I adjust which icons are exported?',
    a: 'Absolutely. After detection you can select or deselect individual icons, use Select All / Select None, and adjust the detection sensitivity slider to refine results.',
  },
  {
    q: 'Is IconMaker free to use?',
    a: 'IconMaker is currently free to use with no limits. Join the waitlist to stay updated on new features and any future changes.',
  },
  
]

function FAQ() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <h2 className="text-center text-3xl font-bold">Frequently Asked Questions</h2>
      <div className="mt-12 divide-y divide-border">
        {faqs.map((f, i) => (
          <div key={i}>
            <button
              className="flex w-full items-center justify-between py-5 text-left font-medium"
              onClick={() => setOpen(open === i ? null : i)}
            >
              {f.q}
              <ChevronDown
                className={cn(
                  'h-5 w-5 shrink-0 text-muted-foreground transition-transform',
                  open === i && 'rotate-180',
                )}
              />
            </button>
            {open === i && (
              <p className="pb-5 text-sm text-muted-foreground">{f.a}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Waitlist Form                                                     */
/* ------------------------------------------------------------------ */
function WaitlistForm() {
  const formspreeId = import.meta.env.VITE_FORMSPREE_ID
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`https://formspree.io/f/${formspreeId}`, {
        method: 'POST',
        body: new FormData(e.currentTarget),
        headers: { Accept: 'application/json' },
      })
      if (res.ok) {
        setSubmitted(true)
      } else {
        setError('Something went wrong. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="waitlist" className="border-t border-border/40 bg-muted/30 py-24">
      <div className="mx-auto max-w-xl px-6 text-center">
        <h2 className="text-3xl font-bold">Join the Waitlist</h2>
        <p className="mt-3 text-muted-foreground">
          Be the first to know about new features and updates.
        </p>

        {submitted ? (
          <div className="mt-10 flex flex-col items-center gap-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="text-lg font-semibold">You're on the list!</p>
            <Link to="/app" className={buttonVariants()}>Launch App</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-10 select-auto space-y-4 text-left">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label htmlFor="role" className="mb-1 block text-sm font-medium">
                Role
              </label>
              <select
                id="role"
                name="role"
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select your role</option>
                <option value="designer">Designer</option>
                <option value="developer">Developer</option>
                <option value="product-manager">Product Manager</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="usecase" className="mb-1 block text-sm font-medium">
                Use case{' '}
                <span className="text-muted-foreground">(optional)</span>
              </label>
              <textarea
                id="usecase"
                name="usecase"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {!formspreeId ? (
              <p className="text-sm text-muted-foreground">
                Set <code className="rounded bg-muted px-1 py-0.5 text-xs">VITE_FORMSPREE_ID</code> to enable
                the waitlist form.
              </p>
            ) : null}

            <Button
              type="submit"
              className="w-full"
              disabled={!formspreeId || loading}
            >
              {loading ? 'Submitting...' : 'Join Waitlist'}
            </Button>
          </form>
        )}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  CTA                                                               */
/* ------------------------------------------------------------------ */
function CTA() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-24 text-center">
      <h2 className="text-3xl font-bold">Ready to extract icons?</h2>
      <p className="mt-3 text-muted-foreground">
        Upload an image and get individual icons in seconds — no signup required.
      </p>
      <Link to="/app" className={cn(buttonVariants({ size: 'lg' }), 'mt-8')}>
        Launch App <ArrowRight className="ml-1 h-4 w-4" />
      </Link>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Footer                                                            */
/* ------------------------------------------------------------------ */
function Footer() {
  return (
    <footer className="border-t border-border/40 py-8 text-center text-sm text-muted-foreground">
      &copy; {new Date().getFullYear()} IconMaker. All rights reserved.
    </footer>
  )
}

/* ------------------------------------------------------------------ */
/*  Landing Page (default export)                                     */
/* ------------------------------------------------------------------ */
export default function LandingPage() {
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark')
    root.classList.add('light')
    return () => {
      root.className = ''
    }
  }, [])

  return (
    <div className="min-h-screen cursor-default select-none bg-background text-foreground">
      <Nav />
      <Hero />
      <DemoVideo />
      <SocialProof />
      <HowItWorks />
      <Features />
      <FAQ />
      <WaitlistForm />
      <CTA />
      <Footer />
    </div>
  )
}
