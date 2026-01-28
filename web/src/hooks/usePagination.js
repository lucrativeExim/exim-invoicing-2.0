import { useMemo, useState, useEffect } from 'react';

/**
 * Custom hook for table pagination functionality
 * 
 * @param {Array} data - Array of data objects to paginate
 * @param {Object} options - Pagination options
 * @param {number} options.itemsPerPage - Number of items per page (default: 10)
 * @param {number} options.initialPage - Initial page number (default: 1)
 * @returns {Object} { currentPage, setCurrentPage, paginatedData, totalPages, totalItems, itemsPerPage, setItemsPerPage, startIndex, endIndex }
 */
export function usePagination(data = [], options = {}) {
  const { itemsPerPage: initialItemsPerPage = 10, initialPage = 1 } = options;
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  // Reset to page 1 when data changes or itemsPerPage changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data.length, itemsPerPage]);

  // Calculate pagination values
  const totalItems = useMemo(() => data.length, [data.length]);
  const totalPages = useMemo(() => Math.ceil(totalItems / itemsPerPage), [totalItems, itemsPerPage]);
  
  const startIndex = useMemo(() => (currentPage - 1) * itemsPerPage, [currentPage, itemsPerPage]);
  const endIndex = useMemo(() => Math.min(startIndex + itemsPerPage, totalItems), [startIndex, itemsPerPage, totalItems]);

  // Get paginated data
  const paginatedData = useMemo(() => {
    return data.slice(startIndex, endIndex);
  }, [data, startIndex, endIndex]);

  // Navigation functions
  const goToPage = (page) => {
    const pageNumber = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(pageNumber);
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const goToNextPage = () => goToPage(currentPage + 1);
  const goToPreviousPage = () => goToPage(currentPage - 1);

  // Check if navigation is possible
  const canGoNext = currentPage < totalPages;
  const canGoPrevious = currentPage > 1;

  return {
    currentPage,
    setCurrentPage: goToPage,
    paginatedData,
    totalPages,
    totalItems,
    itemsPerPage,
    setItemsPerPage,
    startIndex: startIndex + 1, // 1-based index for display
    endIndex,
    goToFirstPage,
    goToLastPage,
    goToNextPage,
    goToPreviousPage,
    canGoNext,
    canGoPrevious,
  };
}

export default usePagination;

