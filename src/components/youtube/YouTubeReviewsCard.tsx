'use client';

import React from 'react';
import { Star } from 'lucide-react';

export const YouTubeReviewsCard: React.FC = () => {
  return (
    <>
      {/* Reviews Section (Tái hiện chuẩn Shadowing English) */}
      <div className="yt-reviews-section">
        <div className="yt-reviews-header">
          <div className="yt-reviews-title">
            <Star size={16} className="text-amber-500 fill-amber-400" />
            <span>Reviews</span>
          </div>
          <button type="button" className="yt-write-review-btn">
            Write a review
          </button>
        </div>
        <div className="yt-reviews-card-body">
          <div className="yt-reviews-prompt-title">How was this lesson?</div>
          <div className="yt-reviews-prompt-desc">
            Share your rating to help other learners find great lessons!
          </div>
        </div>
      </div>

      {/* Practice for tags */}
      <div className="yt-practice-for-wrap">
        <span className="yt-practice-for-label">Practice for:</span>
        <div className="yt-practice-for-tags">
          <span className="yt-tag-pill">University Students</span>
          <span className="yt-tag-pill">Business English</span>
          <span className="yt-tag-pill">Working Adults</span>
        </div>
      </div>
    </>
  );
};
