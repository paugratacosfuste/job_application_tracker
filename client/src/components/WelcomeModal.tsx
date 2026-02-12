import { useState, useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Briefcase,
  Settings,
  Rocket,
  ChevronRight,
  ChevronLeft,
  Kanban,
  FileText,
  BarChart3,
  Sparkles,
  Key,
  Upload,
} from 'lucide-react'

const STEPS = [
  {
    title: 'Welcome to Job Tracker',
    icon: Briefcase,
    content: (
      <div className="flex flex-col items-center text-center gap-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: 'rgba(72, 159, 181, 0.12)' }}
        >
          <Briefcase className="w-8 h-8" style={{ color: '#489FB5' }} />
        </div>
        <div className="space-y-2">
          <p className="text-[hsl(var(--foreground))] text-base font-medium">
            Your personal command center for managing job applications.
          </p>
          <p className="text-[hsl(var(--muted-foreground))] text-sm leading-relaxed max-w-md">
            Track every application from discovery to offer, generate tailored
            cover letters with AI, and get insights into your job search
            progress — all in one place.
          </p>
        </div>
      </div>
    ),
  },
  {
    title: 'Quick Setup',
    icon: Settings,
    content: (
      <div className="flex flex-col items-center text-center gap-5">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: 'rgba(72, 159, 181, 0.12)' }}
        >
          <Settings className="w-8 h-8" style={{ color: '#489FB5' }} />
        </div>
        <p className="text-[hsl(var(--muted-foreground))] text-sm max-w-md">
          The app works great on its own. To unlock AI-powered features, head to{' '}
          <span className="font-semibold text-[hsl(var(--foreground))]">Settings</span>{' '}
          and complete two optional steps:
        </p>
        <div className="w-full max-w-sm space-y-3">
          <div className="flex items-start gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 text-left">
            <div
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: 'rgba(72, 159, 181, 0.12)' }}
            >
              <Key className="h-4 w-4" style={{ color: '#489FB5' }} />
            </div>
            <div>
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                Add your Anthropic API Key
                <span className="ml-1.5 text-xs font-normal text-[hsl(var(--muted-foreground))]">(optional)</span>
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Enables AI job parsing, cover letter generation, and compatibility scoring. The app works without it — you can add it anytime.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 text-left">
            <div
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: 'rgba(72, 159, 181, 0.12)' }}
            >
              <Upload className="h-4 w-4" style={{ color: '#489FB5' }} />
            </div>
            <div>
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                Upload your Master CV
                <span className="ml-1.5 text-xs font-normal text-[hsl(var(--muted-foreground))]">(optional)</span>
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Used by AI to tailor cover letters and calculate match scores for each role. Requires an API key.
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'You\'re All Set',
    icon: Rocket,
    content: (
      <div className="flex flex-col items-center text-center gap-5">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: 'rgba(72, 159, 181, 0.12)' }}
        >
          <Rocket className="w-8 h-8" style={{ color: '#489FB5' }} />
        </div>
        <p className="text-[hsl(var(--muted-foreground))] text-sm max-w-md">
          Here's what you can do:
        </p>
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
          {[
            { icon: Kanban, label: 'Kanban Board', desc: 'Drag & drop workflow' },
            { icon: Sparkles, label: 'AI Parsing', desc: 'Auto-fill from job URLs' },
            { icon: FileText, label: 'Cover Letters', desc: 'AI-generated & tailored' },
            { icon: BarChart3, label: 'Analytics', desc: 'Track your progress' },
          ].map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3"
            >
              <Icon className="h-5 w-5" style={{ color: '#489FB5' }} />
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">{label}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
]

export default function WelcomeModal() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const done = localStorage.getItem('onboarding_complete')
    if (!done) {
      setOpen(true)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem('onboarding_complete', 'true')
    setOpen(false)
  }

  const isLast = step === STEPS.length - 1
  const isFirst = step === 0

  return (
    <Dialog open={open} onOpenChange={handleDismiss}>
      <DialogContent
        className="max-w-md"
        onClose={handleDismiss}
      >
        {/* Step content */}
        <div className="py-6 px-2">
          <h2 className="text-lg font-semibold text-center text-[hsl(var(--foreground))] mb-5">
            {STEPS[step].title}
          </h2>
          {STEPS[step].content}
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-1.5 mb-5">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className="rounded-full transition-all duration-200"
              style={{
                width: i === step ? 20 : 8,
                height: 8,
                backgroundColor: i === step ? '#489FB5' : 'hsl(var(--muted))',
              }}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between gap-3">
          {!isFirst ? (
            <Button
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          ) : (
            <Button
              variant="ghost"
              onClick={handleDismiss}
              className="text-[hsl(var(--muted-foreground))]"
            >
              Skip
            </Button>
          )}

          {isLast ? (
            <Button
              onClick={handleDismiss}
              style={{ backgroundColor: '#489FB5' }}
              className="text-white hover:opacity-90 gap-1"
            >
              <Rocket className="h-4 w-4" />
              Get Started
            </Button>
          ) : (
            <Button
              onClick={() => setStep((s) => s + 1)}
              style={{ backgroundColor: '#489FB5' }}
              className="text-white hover:opacity-90 gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
