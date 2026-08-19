import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function Accordion({ title, children, defaultOpen = false }: { title: React.ReactNode, children: React.ReactNode, defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-4 font-medium transition-all hover:underline focus-visible:outline-none"
      >
        {title}
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="pb-4 pt-0">
          {children}
        </div>
      )}
    </div>
  );
}
