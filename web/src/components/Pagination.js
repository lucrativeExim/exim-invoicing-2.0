'use client';

import { SelectBox } from '@/components/formComponents';

/**
 * Pagination component for tables
 * 
 * @param {Object} props
 * @param {number} props.currentPage - Current page number
 * @param {number} props.totalPages - Total number of pages
 * @param {number} props.totalItems - Total number of items
 * @param {number} props.itemsPerPage - Items per page
 * @param {Function} props.onPageChange - Callback when page changes (page) => void
 * @param {Function} props.onItemsPerPageChange - Callback when items per page changes (itemsPerPage) => void
 * @param {Array} props.itemsPerPageOptions - Options for items per page dropdown (default: [10, 25, 50, 100, 200, 500, 1000, 2000, 5000])
 * @param {string} props.className - Additional CSS classes
 */
export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 25, 50, 100, 200, 500, 1000, 2000, 5000],
  className = '',
}) {
  if (totalPages <= 1 && !onItemsPerPageChange) {
    return null;
  }

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  const handleItemsPerPageChange = (e) => {
    const newItemsPerPage = parseInt(e.target.value, 10);
    if (onItemsPerPageChange && newItemsPerPage !== itemsPerPage) {
      onItemsPerPageChange(newItemsPerPage);
    }
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 7;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total pages is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('...');
      }
      
      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      
      // Always show last page
      pages.push(totalPages);
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={`flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 ${className}`}>
      {/* Items per page selector and info */}
      <div className="flex flex-1 items-center justify-between sm:justify-start gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Show</span>
          {onItemsPerPageChange && (
            <div className="w-24 relative z-10">
              <SelectBox
                name="itemsPerPage"
                value={itemsPerPage.toString()}
                onChange={handleItemsPerPageChange}
                options={itemsPerPageOptions.map(opt => ({ value: opt.toString(), label: opt.toString() }))}
                isSearchable={false}
                isDisabled={false}
                isClearable={false}
                className="text-sm mb-0"
                menuPlacement="bottom"
              />
            </div>
          )}
          <span className="text-sm text-gray-700">
            {totalItems > 0 ? (
              <>entries (showing {startItem}-{endItem} of {totalItems})</>
            ) : (
              <>entries (0 total)</>
            )}
          </span>
        </div>
      </div>

      {/* Page navigation */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          {/* Previous button */}
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`relative inline-flex items-center rounded-md px-2 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 ${
              currentPage === 1
                ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-900 hover:bg-gray-50'
            }`}
            title="Previous page"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {pageNumbers.map((page, index) => {
              if (page === '...') {
                return (
                  <span key={`ellipsis-${index}`} className="px-2 py-2 text-sm text-gray-700">
                    ...
                  </span>
                );
              }
              
              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`relative inline-flex items-center rounded-md px-3 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 ${
                    page === currentPage
                      ? 'bg-primary-600 text-white ring-primary-600'
                      : 'bg-white text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          {/* Next button */}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`relative inline-flex items-center rounded-md px-2 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 ${
              currentPage === totalPages
                ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-900 hover:bg-gray-50'
            }`}
            title="Next page"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

