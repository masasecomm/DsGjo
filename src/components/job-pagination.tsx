import Link from "next/link";

export function JobPagination({
  page,
  totalItems,
  pageSize,
  hrefForPage,
}: {
  page: number;
  totalItems: number;
  pageSize: number;
  hrefForPage: (pageNumber: number) => string;
}) {
  const pageCount = Math.ceil(totalItems / pageSize);
  if (pageCount <= 1) return null;

  return (
    <nav className="job-pagination" aria-label="Vacancy pages">
      {page > 1 && <Link href={hrefForPage(page - 1)} rel="prev">Previous</Link>}
      {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
        <Link
          aria-current={pageNumber === page ? "page" : undefined}
          className={pageNumber === page ? "is-current" : ""}
          href={hrefForPage(pageNumber)}
          key={pageNumber}
        >
          {pageNumber}
        </Link>
      ))}
      {page < pageCount && <Link href={hrefForPage(page + 1)} rel="next">Next</Link>}
    </nav>
  );
}
