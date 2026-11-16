import Image from "next/image";

/** The Figma "Search Input": a 48 px field with a leading search icon; the label is for screen readers. */
export function SearchInput({
  label,
  placeholder,
  value,
  onChange,
  className = "",
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  className?: string | undefined;
}) {
  return (
    <label
      className={`flex h-12 items-center gap-2 rounded-input border border-border-control bg-background-elevated px-4 focus-within:ring-[3px] focus-within:ring-border-default ${className}`}
    >
      <Image alt="" src="/ia/icons/search.svg" width={20} height={20} />
      <span className="sr-only">{label}</span>
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 bg-transparent type-body text-text-primary outline-none placeholder:text-text-placeholder"
      />
    </label>
  );
}
