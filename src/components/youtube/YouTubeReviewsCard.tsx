'use client';

import { Star } from 'lucide-react';

export function YouTubeReviewsCard() {
  return (
    <>
      {/* Reviews Section (Tái hiện chuẩn Shadowing English) */}
      <div className="bg-notion-surface border border-notion-border rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-[0.45rem] text-[0.95rem] font-bold text-notion-text">
            <Star size={16} className="text-notion-yellow-text fill-notion-yellow-text" />
            <span>Reviews</span>
          </div>
          <button type="button" className="bg-notion-primary text-white border-0 rounded-md py-[0.35rem] px-[0.85rem] text-[0.8rem] font-semibold cursor-pointer transition-colors duration-150 hover:bg-notion-primary-hover">
            Write a review
          </button>
        </div>
        <div className="bg-notion-surface-subtle border border-notion-border rounded-lg py-5 px-4 text-center">
          <div className="text-[0.88rem] font-bold text-notion-text mb-1">How was this lesson?</div>
          <div className="text-[0.8rem] text-notion-secondary">
            Share your rating to help other learners find great lessons!
          </div>
        </div>
      </div>

      {/* Practice for tags */}
      <div className="flex items-center gap-[0.6rem] text-[0.82rem] text-notion-secondary py-1 px-2">
        <span className="font-medium whitespace-nowrap">Practice for:</span>
        <div className="flex flex-wrap gap-[0.45rem]">
          <span className="bg-notion-hover border border-notion-border text-notion-text rounded-full py-[0.2rem] px-[0.7rem] text-[0.76rem] font-medium transition-colors duration-150 hover:bg-notion-active">
            University Students
          </span>
          <span className="bg-notion-hover border border-notion-border text-notion-text rounded-full py-[0.2rem] px-[0.7rem] text-[0.76rem] font-medium transition-colors duration-150 hover:bg-notion-active">
            Business English
          </span>
          <span className="bg-notion-hover border border-notion-border text-notion-text rounded-full py-[0.2rem] px-[0.7rem] text-[0.76rem] font-medium transition-colors duration-150 hover:bg-notion-active">
            Working Adults
          </span>
        </div>
      </div>
    </>
  );
}
