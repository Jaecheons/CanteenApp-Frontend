// hooks/usePagination.js
import { useState } from 'react';

const DEFAULT_PAGE_SIZE = 5;

/**
 * Reusable "show N most recent, then paginate the rest" behavior —
 * originally built for MyBookingsScreen, extracted so any list screen
 * can use it without reimplementing the state/page math.
 *
 * @param {Array} items - the already-filtered/sorted list to paginate
 * @param {number} pageSize - items per page (default 5)
 *
 * Usage:
 *   const pagination = usePagination(filteredGroups, 5);
 *   <FlatList data={pagination.paginatedItems} ... />
 *   <PaginationControls {...pagination} totalCount={filteredGroups.length} />
 *
 * IMPORTANT: call pagination.resetPage() whenever the underlying filter
 * changes (search text, status filter, etc.) so the user doesn't land on
 * an empty page after filtering. This hook does not know about your
 * filter state, so it can't do that automatically.
 */
export default function usePagination(items, pageSize = DEFAULT_PAGE_SIZE) {
  const [showAll, setShowAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedItems = showAll
    ? items.slice((safePage - 1) * pageSize, safePage * pageSize)
    : items.slice(0, pageSize);

  const goToPage = (page) => setCurrentPage(Math.min(Math.max(1, page), totalPages));
  const nextPage = () => goToPage(safePage + 1);
  const prevPage = () => goToPage(safePage - 1);

  const expand = () => {
    setShowAll(true);
    setCurrentPage(1);
  };

  const collapse = () => {
    setShowAll(false);
    setCurrentPage(1);
  };

  const resetPage = () => setCurrentPage(1);

  return {
    paginatedItems,
    showAll,
    currentPage: safePage,
    totalPages,
    pageSize,
    hasMore: items.length > pageSize,
    goToPage,
    nextPage,
    prevPage,
    expand,
    collapse,
    resetPage,
  };
}
