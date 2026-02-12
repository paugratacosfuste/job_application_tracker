import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Kanban,
  BrainCircuit,
  FileText,
  BarChart3,
  FolderOpen,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: Kanban,
    title: "Kanban Board",
    description:
      "Drag-and-drop cards to track every application stage, from applied to offer accepted.",
  },
  {
    icon: BrainCircuit,
    title: "AI Job Parsing",
    description:
      "Paste a URL or raw text and let AI extract structured job details instantly.",
  },
  {
    icon: FileText,
    title: "Cover Letter Generator",
    description:
      "AI-powered cover letters tailored to each job description and your experience.",
  },
  {
    icon: BarChart3,
    title: "Match Analysis",
    description:
      "See how your CV matches job requirements with an AI compatibility score.",
  },
  {
    icon: FolderOpen,
    title: "Resume Management",
    description:
      "Store, organize, and attach the right resume version to every application.",
  },
  {
    icon: TrendingUp,
    title: "Analytics Dashboard",
    description:
      "Track response rates, salary trends, and your application timeline at a glance.",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 md:py-32">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-3xl leading-tight">
          Track Your Job Applications{" "}
          <span style={{ color: "#489FB5" }}>with AI</span>
        </h1>

        <p className="mt-6 text-lg md:text-xl max-w-2xl text-[hsl(var(--muted-foreground))]">
          Organize every application on a Kanban board, generate tailored cover
          letters, and let AI analyze how well your profile matches each role.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <Button
            size="lg"
            className="gap-2 text-base"
            style={{ backgroundColor: "#489FB5" }}
            onClick={() => navigate("/signup")}
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="text-base"
            onClick={() => navigate("/login")}
          >
            Sign In
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-24 md:pb-32 max-w-6xl w-full mx-auto">
        <h2 className="text-2xl md:text-3xl font-semibold text-center mb-12">
          Everything you need to land your next role
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, description }) => (
            <Card
              key={title}
              className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[#489FB5]/50 transition-colors"
            >
              <CardContent className="p-6 flex flex-col gap-4">
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: "#489FB520" }}
                >
                  <Icon className="h-5 w-5" style={{ color: "#489FB5" }} />
                </div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
                  {description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[hsl(var(--border))] py-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
        Built with Supabase &amp; React &middot; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
