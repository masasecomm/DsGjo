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
  const firstVisiblePage = Math.max(2, page - 2);
  const lastVisiblePage = Math.min(pageCount - 1, page + 2);
  const visiblePages = [
    1,
    ...(firstVisiblePage > 2 ? ["ellipsis-start" as const] : []),
    ...Array.from(
      { length: Math.max(0, lastVisiblePage - firstVisiblePage + 1) },
      (_, index) => firstVisiblePage + index,
    ),
    ...(lastVisiblePage < pageCount - 1 ? ["ellipsis-end" as const] : []),
    ...(pageCount > 1 ? [pageCount] : []),
  ];

  return (
    <nav className="job-pagination" aria-label="Vacancy pages">
      <ul className="pagination">
        <li className={`page-item${page === 1 ? " disabled" : ""}`}>
          {page === 1
            ? <span className="page-link" aria-disabled="true">Previous</span>
            : <Link className="page-link" href={hrefForPage(page - 1)} rel="prev">Previous</Link>}
        </li>
        {visiblePages.map((pageNumber) => typeof pageNumber === "number" ? (
          <li className={`page-item${pageNumber === page ? " active" : ""}`} key={pageNumber}>
            <Link
              aria-current={pageNumber === page ? "page" : undefined}
              className="page-link"
              href={hrefForPage(pageNumber)}
            >
              {pageNumber}
            </Link>
          </li>
        ) : (
          <li className="page-item disabled" key={pageNumber}>
            <span className="page-link" aria-hidden="true">…</span>
          </li>
        ))}
        <li className={`page-item${page === pageCount ? " disabled" : ""}`}>
          {page === pageCount
            ? <span className="page-link" aria-disabled="true">Next</span>
            : <Link className="page-link" href={hrefForPage(page + 1)} rel="next">Next</Link>}
        </li>
      </ul>
    </nav>
  );
}
