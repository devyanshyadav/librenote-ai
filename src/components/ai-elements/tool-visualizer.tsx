"use client";

import React, { useState } from "react";
import { Activity, User, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Dosage Slider Card ──────────────────────────────────────────────────────
interface DosageSliderCardProps {
  medicineName: string;
  baseDosageMgPerKg: number;
}

export const DosageSliderCard = ({
  medicineName,
  baseDosageMgPerKg,
}: DosageSliderCardProps) => {
  const [weight, setWeight] = useState(70);

  const dosage = weight * baseDosageMgPerKg;

  return (
    <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-lg animate-in zoom-in duration-300">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-primary/10 p-3 rounded-2xl">
          <Activity className="size-6 text-primary" />
        </div>
        <div>
          <h4 className="font-bold text-foreground text-lg">
            Dosage Calculator
          </h4>
          <p className="text-xs text-muted-foreground">{medicineName}</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex justify-between text-sm font-semibold mb-2">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <User className="size-4" /> Patient Weight
            </span>
            <span className="text-primary font-bold">{weight} kg</span>
          </div>
          <input
            type="range"
            min="10"
            max="120"
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>Child (10 kg)</span>
            <span>Adult (120 kg)</span>
          </div>
        </div>

        <div className="bg-linear-to-br from-primary/5 to-accent/5 border border-primary/10 rounded-2xl p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Recommended Safe Dosage
          </p>
          <p className="text-3xl font-extrabold text-primary tracking-tight mt-1">
            {dosage} mg
          </p>
          <p className="text-[10px] text-muted-foreground mt-2">
            Calculation based on standard formula of {baseDosageMgPerKg} mg per
            kg of body weight.
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Triage Swipe/Deck Card ──────────────────────────────────────────────────
interface TriageSwipeCardProps {
  symptomsDescription: string;
  questions: string[];
}

export const TriageSwipeCard = ({
  symptomsDescription,
  questions,
}: TriageSwipeCardProps) => {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, boolean>>({});

  const handleAnswer = (val: boolean) => {
    setAnswers((prev) => ({ ...prev, [index]: val }));
    setIndex((prev) => prev + 1);
  };

  const isCompleted = index >= questions.length;

  return (
    <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-lg transition-all animate-in zoom-in duration-300">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-linear-to-br from-primary/10 to-accent/10 p-3 rounded-2xl">
          <Activity className="size-6 text-primary animate-pulse" />
        </div>
        <div>
          <h4 className="font-bold text-foreground text-lg">Symptom Triage</h4>
          <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">
            {symptomsDescription}
          </p>
        </div>
      </div>

      {!isCompleted ? (
        <div className="space-y-6">
          <div className="min-h-[100px] flex items-center justify-center text-center p-4 border border-dashed border-border rounded-2xl bg-sidebar/50">
            <p className="text-base font-medium text-foreground leading-snug">
              {questions[index]}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleAnswer(false)}
              className="flex-1 py-3 px-4 rounded-xl border border-border bg-card text-foreground font-semibold text-sm hover:bg-muted active:scale-95 transition-all cursor-pointer"
            >
              No
            </button>
            <button
              type="button"
              onClick={() => handleAnswer(true)}
              className="flex-1 py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 active:scale-95 shadow-md shadow-primary/20 transition-all cursor-pointer"
            >
              Yes
            </button>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>
              {index + 1} of {questions.length}
            </span>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 space-y-4 animate-in zoom-in duration-300">
          <div className="inline-flex bg-emerald-500/10 p-4 rounded-full text-emerald-500 mb-2">
            <CheckCircle2 className="size-10" />
          </div>
          <div>
            <h5 className="font-bold text-foreground text-lg">
              Triage Completed
            </h5>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1">
              Assessment finished. Results are compiled for processing.
            </p>
          </div>
          <div className="text-left text-xs bg-muted p-4 rounded-2xl border border-border space-y-1">
            <p className="font-bold text-muted-foreground uppercase tracking-wider text-[10px] mb-1">
              Your Responses
            </p>
            {questions.map((q, idx) => (
              <div
                key={q}
                className="flex justify-between border-b border-border/40 py-1 last:border-0"
              >
                <span className="text-muted-foreground pr-2 truncate max-w-[220px]">
                  {q}
                </span>
                <span
                  className={cn(
                    "font-semibold",
                    answers[idx] ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {answers[idx] ? "Yes" : "No"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
