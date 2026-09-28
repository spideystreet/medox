import { Link } from "@tanstack/react-router";

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6">
      <div className="text-center animate-fade-in">
        <h1 className="font-serif text-7xl text-text-primary mb-4">404</h1>
        <p className="font-serif text-2xl text-text-secondary mb-2">Page introuvable</p>
        <p className="text-text-muted text-sm mb-8 max-w-sm mx-auto">
          Cette adresse n&apos;existe pas.
        </p>
        <Link
          to="/"
          className="inline-flex items-center rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent-dim transition-colors"
        >
          Retour à Medox
        </Link>
      </div>
    </div>
  );
}
