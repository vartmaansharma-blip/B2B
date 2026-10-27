"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Search,
  Factory,
  Files,
  ArrowUpRight,
  LoaderCircle,
  X,
} from "lucide-react";
import { searchWorkspace, type SearchResult } from "./actions";
export function QuickFind() {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  function show() {
    dialog.current?.showModal();
    setOpen(true);
    input.current?.focus();
  }
  function close() {
    dialog.current?.close();
    setOpen(false);
    setPending(false);
    setQuery("");
    setResults([]);
    setError("");
  }
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (dialog.current?.open) dialog.current.close();
        else {
          dialog.current?.showModal();
          setOpen(true);
          input.current?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    if (!open || query.trim().length < 2) return;
    let ignore = false;
    const timer = setTimeout(() => {
      setPending(true);
      setError("");
      searchWorkspace(query)
        .then((result) => {
          if (!ignore) {
            setResults(result.results);
            setError(result.error ?? "");
          }
        })
        .catch(() => {
          if (!ignore)
            setError(
              "Search is unavailable. Sign in again if your session expired.",
            );
        })
        .finally(() => {
          if (!ignore) setPending(false);
        });
    }, 220);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [query, open]);
  const visibleResults = query.trim().length >= 2 ? results : [];
  return (
    <>
      <button
        className="quick-find-trigger"
        aria-label="Quick find"
        onClick={show}
      >
        <Search size={13} />
        <span>Quick find</span>
        <kbd>⌘ K</kbd>
      </button>
      <dialog
        ref={dialog}
        className="search-dialog"
        onClose={close}
        aria-label="Quick find workspace records"
        onClick={(event) => {
          if (event.target === dialog.current) close();
        }}
      >
        <div className="search-dialog-content">
          <div className="search-input-row">
            <Search size={17} />
            <input
              ref={input}
              aria-label="Search suppliers and RFQs"
              placeholder="Search suppliers and RFQs…"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setResults([]);
                setError("");
                setPending(event.target.value.trim().length >= 2);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  dialog.current
                    ?.querySelector<HTMLAnchorElement>("a[data-result]")
                    ?.focus();
                }
                if (event.key === "Enter")
                  dialog.current
                    ?.querySelector<HTMLAnchorElement>("a[data-result]")
                    ?.click();
              }}
            />
            {pending ? (
              <LoaderCircle size={15} className="spinning" />
            ) : (
              <button
                aria-label="Close quick find"
                className="icon-button"
                onClick={close}
              >
                <X size={15} />
              </button>
            )}
          </div>
          <div className="search-results" aria-live="polite">
            {error ? (
              <p className="search-hint" role="alert">
                {error}
              </p>
            ) : query.trim().length < 2 ? (
              <div className="search-idle">
                <span className="eyebrow">GO STRAIGHT TO THE RECORD</span>
                <p>
                  Find a supplier or customer requirement.
                  <br />
                  Search by business name or RFQ title.
                </p>
                <div className="search-shortcuts">
                  <Link href="/suppliers/new" onClick={close}>
                    <Factory size={15} />
                    Add supplier
                    <ArrowUpRight size={12} />
                  </Link>
                  <Link href="/rfqs/customers" onClick={close}>
                    <Files size={15} />
                    Create RFQ
                    <ArrowUpRight size={12} />
                  </Link>
                </div>
              </div>
            ) : visibleResults.length ? (
              <div className="search-result-list">
                {visibleResults.map((result, index) => (
                  <Link
                    data-result
                    key={`${result.kind}-${result.id}`}
                    href={result.href}
                    onClick={close}
                    onKeyDown={(event) => {
                      const links =
                        dialog.current?.querySelectorAll<HTMLAnchorElement>(
                          "a[data-result]",
                        );
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        links?.[(index + 1) % visibleResults.length]?.focus();
                      }
                      if (event.key === "ArrowUp") {
                        event.preventDefault();
                        if (index === 0) input.current?.focus();
                        else links?.[index - 1]?.focus();
                      }
                    }}
                  >
                    <span className="record-avatar">
                      {result.kind === "supplier" ? (
                        <Factory size={15} />
                      ) : (
                        <Files size={15} />
                      )}
                    </span>
                    <span className="record-name">
                      <strong>{result.title}</strong>
                      <small>
                        {result.kind === "supplier" ? "Supplier" : "RFQ"} ·{" "}
                        {result.subtitle}
                      </small>
                    </span>
                    <ArrowUpRight size={14} />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="search-hint">
                {pending
                  ? "Looking through your workspace…"
                  : "No matching records. Try another name or title."}
              </p>
            )}
          </div>
          <div className="search-footer">
            <span>
              <kbd>↑</kbd>
              <kbd>↓</kbd> to navigate <kbd>↵</kbd> to open
            </span>
            <span>
              <kbd>esc</kbd> to close
            </span>
          </div>
        </div>
      </dialog>
    </>
  );
}
