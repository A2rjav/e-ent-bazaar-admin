"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  COUNTRY_CODES,
  DEFAULT_COUNTRY,
  type CountryCode,
} from "@/lib/country-codes";

interface PhoneInputProps {
  value: string;
  onChange: (fullValue: string) => void;
  disabled?: boolean;
  placeholder?: string;
  error?: string;
  className?: string;
  id?: string;
}

export function PhoneInput({
  value,
  onChange,
  disabled,
  placeholder,
  error,
  className,
  id,
}: PhoneInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const { country, localNumber } = parsePhoneValue(value);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(
    country ?? DEFAULT_COUNTRY
  );

  useEffect(() => {
    if (country && country.code !== selectedCountry.code) {
      setSelectedCountry(country);
    }
  }, [country, selectedCountry.code]);

  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
    } else {
      setSearch("");
    }
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return COUNTRY_CODES;
    const q = search.toLowerCase();
    return COUNTRY_CODES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [search]);

  function handleCountrySelect(c: CountryCode) {
    setSelectedCountry(c);
    setOpen(false);
    onChange(`${c.dialCode} ${localNumber}`);
  }

  function handleDigitChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, selectedCountry.maxDigits);
    onChange(`${selectedCountry.dialCode} ${digits}`);
  }

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center rounded-md border border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1">
        {/* Country code selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOpen(!open)}
            className={cn(
              "inline-flex h-9 items-center gap-1 rounded-l-md border-r border-input bg-muted px-2.5 text-sm transition-colors hover:bg-accent disabled:opacity-50",
              open && "bg-accent"
            )}
          >
            <span className="text-base leading-none">{selectedCountry.flag}</span>
            <span className="text-muted-foreground">{selectedCountry.dialCode}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>

          {open && (
            <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-md border bg-popover shadow-lg">
              <div className="flex items-center border-b px-2.5 py-2">
                <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search country..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <div className="max-h-52 overflow-y-auto py-1">
                {filtered.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">No results</p>
                ) : (
                  filtered.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleCountrySelect(c)}
                      className={cn(
                        "flex w-full items-center gap-2.5 px-3 py-1.5 text-sm transition-colors hover:bg-accent",
                        c.code === selectedCountry.code && "bg-accent font-medium"
                      )}
                    >
                      <span className="text-base leading-none">{c.flag}</span>
                      <span className="flex-1 text-left truncate">{c.name}</span>
                      <span className="text-muted-foreground">{c.dialCode}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Phone number input */}
        <Input
          id={id}
          type="tel"
          inputMode="numeric"
          placeholder={placeholder ?? "Enter phone number"}
          value={localNumber}
          onChange={(e) => handleDigitChange(e.target.value)}
          maxLength={selectedCountry.maxDigits + 2}
          disabled={disabled}
          className="rounded-l-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function parsePhoneValue(
  val: string
): { country: CountryCode | null; localNumber: string } {
  if (!val || !val.trim()) return { country: null, localNumber: "" };

  const stripped = val.replace(/\s+/g, " ").trim();

  if (stripped.startsWith("+")) {
    for (const c of COUNTRY_CODES) {
      if (stripped.startsWith(c.dialCode)) {
        const local = stripped.slice(c.dialCode.length).replace(/\D/g, "");
        return { country: c, localNumber: local };
      }
    }
  }

  return { country: null, localNumber: stripped.replace(/\D/g, "") };
}
