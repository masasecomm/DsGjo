import Link from "next/link";

export function ProvinceFilters({
  provinces,
  activeProvince,
  totalCount,
}: {
  provinces: Array<{ name: string; count: number }>;
  activeProvince?: string;
  totalCount: number;
}) {
  return (
    <nav className="province-filters" id="provinces" aria-label="Browse vacancies by province">
      <Link className={`province-filter${activeProvince ? "" : " is-active"}`} href="/jobs" aria-current={activeProvince ? undefined : "page"}>
        All ({totalCount})
      </Link>
      {provinces.map(({ name, count }) => {
        const isActive = activeProvince?.toLowerCase() === name.toLowerCase();
        return (
          <Link
            className={`province-filter${isActive ? " is-active" : ""}`}
            href={`/jobs?province=${encodeURIComponent(name)}`}
            key={name}
            aria-current={isActive ? "page" : undefined}
          >
            {name} ({count})
          </Link>
        );
      })}
    </nav>
  );
}
