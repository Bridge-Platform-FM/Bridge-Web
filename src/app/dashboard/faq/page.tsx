"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { AsyncState } from "@/components/ui/AsyncState";
import { fetchFaqs } from "@/services/faq.service";
import type { FaqItem } from "@/types/api.types";
import type { ApiError } from "@/lib/axios";

export default function FaqPage() {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchFaqs()
      .then((data) => setFaqs(data))
      .catch((err: ApiError) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id: number) =>
    setOpenId((prev) => (prev === id ? null : id));

  return (
    <div className="mx-auto max-w-3xl p-6 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-headline text-2xl font-extrabold tracking-[-0.02em] text-on-surface md:text-3xl">
          Frequently Asked Questions
        </h1>
        <p className="mt-1 text-on-surface-variant">
          Find answers to common questions about the platform.
        </p>
      </div>

      {/* FAQ Accordion */}
      <AsyncState
        loading={loading}
        error={error}
        onRetry={load}
        isEmpty={faqs.length === 0}
        emptyIcon="quiz"
        emptyText="No FAQs available at the moment."
      >
        <div className="flex flex-col gap-3">
          {faqs.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <Card key={faq.id} surface="lowest" padding="none" className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggle(faq.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-container-low"
                >
                  <span className="text-sm font-semibold text-on-surface">
                    {faq.question}
                  </span>
                  <Icon
                    name={isOpen ? "keyboard_arrow_up" : "keyboard_arrow_down"}
                    size={20}
                    className="shrink-0 text-on-surface-variant"
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="answer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-outline/10 px-5 py-4">
                        <p className="text-sm leading-relaxed text-on-surface-variant">
                          {faq.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })}
        </div>
      </AsyncState>
    </div>
  );
}
