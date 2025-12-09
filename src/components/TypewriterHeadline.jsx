import React, { useState, useEffect, useRef } from "react";

const TypewriterHeadline = ({
  phrases = [
    "WhatsApp Marketing",
    "WhatsApp Automation",
    "No-code chatbot builder",
    "Auto Reply",
  ],
  baseText = "Transform your business with ",
  typingSpeed = 100,
  deletingSpeed = 50,
  pauseTime = 1100,
  className = "text-3xl lg:text-4xl font-bold text-gray-900 mb-4",
}) => {
  const [currentPhrase, setCurrentPhrase] = useState(phrases[0]);
  const [displayedText, setDisplayedText] = useState(phrases[0]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  const timeoutRef = useRef(null);
  const cursorIntervalRef = useRef(null);
  const prefersReducedMotion = useRef(
    typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  // Cursor blinking effect
  useEffect(() => {
    if (prefersReducedMotion.current) return;

    cursorIntervalRef.current = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);

    return () => {
      if (cursorIntervalRef.current) {
        clearInterval(cursorIntervalRef.current);
      }
    };
  }, []);

  // Main typing animation
  useEffect(() => {
    if (prefersReducedMotion.current) {
      // Cross-fade animation for reduced motion
      const interval = setInterval(() => {
        setPhraseIndex(prev => (prev + 1) % phrases.length);
        setCurrentPhrase(phrases[(phraseIndex + 1) % phrases.length]);
      }, 1500);

      return () => clearInterval(interval);
    }

    const currentPhraseText = phrases[phraseIndex];
    const speed = isDeleting ? deletingSpeed : typingSpeed;

    timeoutRef.current = setTimeout(() => {
      if (isDeleting) {
        setDisplayedText(
          currentPhraseText.substring(0, displayedText.length - 1)
        );

        if (displayedText.length === 0) {
          setIsDeleting(false);
          setPhraseIndex(prev => (prev + 1) % phrases.length);
        }
      } else {
        setDisplayedText(
          currentPhraseText.substring(0, displayedText.length + 1)
        );

        if (displayedText === currentPhraseText) {
          timeoutRef.current = setTimeout(() => {
            setIsDeleting(true);
          }, pauseTime);
        }
      }
    }, speed);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [
    displayedText,
    isDeleting,
    phraseIndex,
    phrases,
    typingSpeed,
    deletingSpeed,
    pauseTime,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (cursorIntervalRef.current) {
        clearInterval(cursorIntervalRef.current);
      }
    };
  }, []);

  // Analytics tracking
  useEffect(() => {
    if (typeof window !== "undefined" && window.analytics) {
      window.analytics.track("headline_phrase_shown", {
        phrase: displayedText,
        orderIndex: phraseIndex,
      });
    }
  }, [displayedText, phraseIndex]);

  const displayText = prefersReducedMotion.current
    ? currentPhrase
    : displayedText;

  // Find the longest phrase to set fixed width
  const longestPhrase = phrases.reduce(
    (longest, phrase) => (phrase.length > longest.length ? phrase : longest),
    phrases[0]
  );

  return (
    <div className={className}>
      <div
        aria-live="polite"
        aria-atomic="true"
        className="overflow-hidden"
        style={{
          minHeight: "1.5em",
        }}
      >
        <div className="flex items-start flex-wrap">
          <span className="whitespace-nowrap">{baseText}</span>
          <span
            className="text-emerald-600 whitespace-nowrap inline-block"
            style={{
              minWidth: `${longestPhrase.length}ch`,
              textAlign: "left",
              minHeight: "1.5em",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            {displayText}
            {!prefersReducedMotion.current && (
              <span
                aria-hidden="true"
                className={`inline-block w-0.5 h-[1.1em] ml-1 ${
                  showCursor ? "opacity-100" : "opacity-0"
                } transition-opacity duration-75`}
                style={{
                  backgroundColor: "currentColor",
                  animation: "none",
                }}
              />
            )}
          </span>
        </div>
      </div>

      {/* Screen reader only text */}
      <div className="sr-only">
        {baseText}
        {displayText}
      </div>
    </div>
  );
};

export default TypewriterHeadline;
