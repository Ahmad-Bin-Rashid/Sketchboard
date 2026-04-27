"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FAQItemProps {
  question: string;
  answer: string;
}

function FAQItem({ question, answer }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div 
      className="group overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 hover:border-primary/30"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-5 text-left font-medium text-foreground focus:outline-none"
      >
        <span className="flex items-center gap-3 text-sm sm:text-base">
          <HelpCircle className="h-4 w-4 shrink-0 text-primary/70 group-hover:text-primary transition-colors" />
          {question}
        </span>
        <ChevronDown 
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300",
            isOpen && "rotate-180 text-primary"
          )} 
        />
      </button>
      <div 
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <p className="border-t border-border/40 p-5 pt-4 text-xs sm:text-sm text-muted-foreground leading-relaxed bg-surface/30">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FAQAccordion() {
  const faqs = [
    {
      question: "Do I need to sign up to use the whiteboard?",
      answer: "No, you don't! You can create a whiteboard instantly as a guest. All drawings and settings are auto-saved directly to your local browser storage so you can retrieve them anytime you visit from the same browser."
    },
    {
      question: "How do I collaborate with other users?",
      answer: "Simply copy the URL of your board (e.g., from the Share button in the header) and send it to your team. Anyone who opens the link will immediately join your workspace and see your live cursor and edits in real-time."
    },
    {
      question: "What benefits does signing up/signing in offer?",
      answer: "Signing in unlocks cloud persistence. Instead of storing data locally in your browser, your whiteboards are saved securely in our database. This enables you to access your boards from any device, manage multiple boards in a dedicated dashboard, and configure team member roles (owner, admin, editor, viewer) for advanced access control."
    },
    {
      question: "Can I import and export my boards?",
      answer: "Absolutely! You can export any board as a local file. This file can be imported back into another session or shared with a colleague to reload the complete board canvas exactly as it was."
    },
    {
      question: "Are image uploads supported?",
      answer: "Yes. In guest mode, you can add images which are stored locally in your browser (as base64 data URLs). In authenticated mode, images are uploaded securely to our Uploadthing CDN, indexed in the database, and rendered at high speed."
    }
  ];

  return (
    <div className="flex flex-col gap-3.5 max-w-2xl mx-auto w-full text-left">
      {faqs.map((faq, idx) => (
        <FAQItem key={idx} question={faq.question} answer={faq.answer} />
      ))}
    </div>
  );
}
