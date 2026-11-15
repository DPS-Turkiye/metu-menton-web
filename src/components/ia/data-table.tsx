import type { ReactNode } from "react";

export type DataColumn = {
  key: string;
  label: ReactNode;
  /** Width and alignment classes for the column's cells. */
  className?: string | undefined;
};

/**
 * The Figma "Tablo": a 24 px card with a muted caption row and divided body rows. It is a real table, so screen
 * readers announce the column for each cell; on a narrow screen it scrolls sideways inside the card.
 */
export function DataTable({
  caption,
  columns,
  children,
}: {
  caption: string;
  columns: readonly DataColumn[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-card border border-border-subtle bg-background-surface p-2">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border-subtle">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`px-4 py-3 type-caption font-normal text-text-muted ${column.className ?? ""}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">{children}</tbody>
      </table>
    </div>
  );
}

/** A body cell: 12 px vertical, 16 px horizontal padding, Body/Small text. */
export function DataCell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <td className={`px-4 py-3 type-body-sm text-text-primary ${className}`}>
      {children}
    </td>
  );
}
