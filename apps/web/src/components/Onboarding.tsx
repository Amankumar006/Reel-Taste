'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { GENRES, SERVICES } from '@/app/data/movies';

interface OnboardingProps {
  onComplete: (genres: string[], services: string[]) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<'splash' | 'genres' | 'services'>('splash');
  const [genres, setGenres] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);

  const toggle = (value: string, list: string[], setList: (next: string[]) => void) => {
    setList(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  };

  // Splash screen
  if (step === 'splash') {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#0a1628] via-[#0d2a2a] to-[#0a1628] flex flex-col items-center justify-center px-6 text-white">
        {/* Floating orb decoration */}
        <div className="absolute top-20 left-10 h-64 w-64 rounded-full bg-teal-500/20 blur-[100px]" />
        <div className="absolute bottom-20 right-10 h-80 w-80 rounded-full bg-blue-500/10 blur-[120px]" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-lg">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-xl mb-6">
            <Sparkles size={14} className="text-teal-400" />
            <span className="text-xs font-medium text-white/90">Personalized Picks</span>
          </div>

          {/* Hero heading */}
          <h1 className="text-5xl font-bold tracking-tight text-white mb-4">
            Your Next
            <br />
            Favorite Film
          </h1>

          {/* Stats row */}
          <div className="flex items-center gap-3 text-sm text-white/60 mb-6">
            <span>10K+ Movies</span>
            <span className="h-1 w-1 rounded-full bg-white/40" />
            <span>12 Genres</span>
            <span className="h-1 w-1 rounded-full bg-white/40" />
            <span>AI-Powered</span>
          </div>

          {/* Description */}
          <p className="text-base text-white/70 leading-relaxed mb-10 max-w-md">
            Tell us what you love, and we'll build a taste profile that gets smarter with every
            rating. Discover films you'll actually want to watch.
          </p>

          {/* CTA */}
          <button
            type="button"
            onClick={() => setStep('genres')}
            className="rounded-full bg-teal-500 px-10 py-4 text-base font-semibold text-white shadow-lg shadow-teal-500/30 transition-all hover:bg-teal-400 hover:shadow-teal-400/40"
          >
            Get Started
          </button>
        </div>
      </div>
    );
  }

  // Genres step
  if (step === 'genres') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d2a2a] to-[#0a1628] px-6 py-12 text-white">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white mb-3">
              What genres do you love?
            </h2>
            <p className="text-base text-white/60">Pick at least one to continue</p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {GENRES.map((genre) => {
              const active = genres.includes(genre);
              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => toggle(genre, genres, setGenres)}
                  className={`rounded-full border px-6 py-3 text-sm font-medium backdrop-blur-xl transition-all ${
                    active
                      ? 'border-teal-400 bg-teal-400/20 text-teal-300 shadow-lg shadow-teal-500/20'
                      : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10'
                  }`}
                >
                  {genre}
                </button>
              );
            })}
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setStep('services')}
              disabled={genres.length === 0}
              className="rounded-full bg-teal-500 px-10 py-4 text-base font-semibold text-white shadow-lg shadow-teal-500/30 transition-all hover:bg-teal-400 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Services step
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d2a2a] to-[#0a1628] px-6 py-12 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white mb-3">
            Which streaming services do you have?
          </h2>
          <p className="text-base text-white/60">We'll prioritize movies you can watch now</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-10 sm:grid-cols-3">
          {SERVICES.map((service) => {
            const active = services.includes(service.id);
            return (
              <button
                key={service.id}
                type="button"
                onClick={() => toggle(service.id, services, setServices)}
                className={`flex flex-col items-center gap-3 rounded-2xl border p-6 backdrop-blur-xl transition-all ${
                  active
                    ? 'border-teal-400 bg-teal-400/20 shadow-lg shadow-teal-500/20'
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                }`}
              >
                <span
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold ${
                    active ? 'bg-teal-500 text-white' : 'bg-white/10 text-white/70'
                  }`}
                >
                  {service.short}
                </span>
                <span
                  className={`text-sm font-medium ${active ? 'text-teal-300' : 'text-white/70'}`}
                >
                  {service.name}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={() => setStep('genres')}
            className="rounded-full border border-white/10 bg-white/5 px-8 py-4 text-base font-medium text-white/70 backdrop-blur-xl transition-all hover:bg-white/10"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => onComplete(genres, services)}
            className="rounded-full bg-teal-500 px-10 py-4 text-base font-semibold text-white shadow-lg shadow-teal-500/30 transition-all hover:bg-teal-400"
          >
            Start Exploring
          </button>
        </div>
      </div>
    </div>
  );
}
