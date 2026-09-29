import React, { useState } from 'react';
import { RotateCcw, Check, X } from 'lucide-react';
import { StrengthThresholds } from '../types';

interface ThresholdsModalProps {
  currentThresholds: StrengthThresholds;
  isOpen: boolean;
  onClose: () => void;
  onSave: (strong: number, weak: number) => void;
}

export const ThresholdsModal: React.FC<ThresholdsModalProps> = ({
  currentThresholds,
  isOpen,
  onClose,
  onSave
}) => {
  const [strong, setStrong] = useState(currentThresholds.strongThreshold);
  const [weak, setWeak] = useState(currentThresholds.weakThreshold);

  if (!isOpen) return null;

  const handleReset = () => {
    setStrong(0.1);
    setWeak(-0.1);
  };

  const handleApply = () => {
    onSave(strong, weak);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-velqo-ink/80 p-4 backdrop-blur-md">
      <div className="velqo-card w-full max-w-md px-5 py-5">
        <div className="mb-4 flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div>
            <p className="velqo-eyebrow mb-1.5">Framework</p>
            <h3 className="velqo-display text-lg text-white">Strength thresholds</h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.07] text-slate-400 transition-colors hover:border-teal-400/30 hover:text-teal-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-4 text-[0.78rem] leading-relaxed text-slate-400">
          Adjust the relative basket boundaries used to classify currencies as strong, balanced or
          weak. Changing a threshold re-labels evidence; it never changes the evidence itself.
        </p>

        <div className="mb-6 space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between text-[0.78rem]">
              <span className="text-slate-400">Strong at or above</span>
              <span className="font-semibold text-teal-300 tnum">+{strong.toFixed(2)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.50"
              step="0.01"
              value={strong}
              onChange={(e) => setStrong(parseFloat(e.target.value))}
              aria-label="Strong threshold"
              className="w-full cursor-pointer accent-teal-400"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-[0.78rem]">
              <span className="text-slate-400">Weak at or below</span>
              <span className="font-semibold text-rose-300 tnum">{weak.toFixed(2)}%</span>
            </div>
            <input
              type="range"
              min="-0.50"
              max="-0.05"
              step="0.01"
              value={weak}
              onChange={(e) => setWeak(parseFloat(e.target.value))}
              aria-label="Weak threshold"
              className="w-full cursor-pointer accent-rose-400"
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/[0.06] pt-3 text-[0.75rem]">
          <button
            onClick={handleReset}
            className="flex min-h-9 items-center gap-1.5 rounded-full px-2 text-slate-400 transition-colors hover:text-teal-200"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to +0.10 / −0.10
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="min-h-9 rounded-full border border-white/[0.07] px-3.5 text-slate-400 transition-colors hover:border-teal-400/30 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="flex min-h-9 items-center gap-1.5 rounded-full bg-teal-400 px-4 font-semibold text-velqo-ink transition-colors hover:bg-teal-300"
            >
              <Check className="w-3.5 h-3.5" />
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
