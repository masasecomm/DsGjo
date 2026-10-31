import Link from "next/link";

export function ProvinceFilters({
  provinces,
  activeProvince,
}: {
  provinces: string[];
  activeProvince?: string;
}) {
  return (
    <nav className="province-filters" aria-label="Browse vacancies by province">
      <Link className={`province-filter${activeProvince ? "" : " is-active"}`} href="/jobs" aria-current={activeProvince ? undefined : "page"}>
        All
      </Link>
      {provinces.map((province) => {
        const isActive = activeProvince?.toLowerCase() === province.toLowerCase();
        return (
          <Link
            className={`province-filter${isActive ? " is-active" : ""}`}
            href={`/jobs?q=${encodeURIComponent(province)}`}
            key={province}
            aria-current={isActive ? "page" : undefined}
          >
            {province}
          </Link>
        );
      })}
    </nav>
  );
}
