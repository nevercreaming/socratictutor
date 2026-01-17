
import React from 'react';

interface MathDisplayProps {
  content: string;
}

/**
 * A simple component to format text that might contain math notation.
 * For a real app, we'd use MathJax or KaTeX, but for this demo, 
 * we'll clean up basic LaTeX-style strings for readability.
 */
export const MathDisplay: React.FC<MathDisplayProps> = ({ content }) => {
  // Replace common math patterns with cleaner versions for display
  const formatted = content
    .replace(/\^(\d+)/g, '<sup>$1</sup>')
    .replace(/\* /g, '• ')
    .split('\n')
    .map((line, i) => (
      <p key={i} className="mb-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: line }} />
    ));

  return <div className="math-content">{formatted}</div>;
};
