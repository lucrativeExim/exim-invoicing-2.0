"use client";

import { useState, useEffect, useRef } from "react";

export default function ShowMore({ 
  onMoveToProforma, 
  onDownloadPdf, 
  onCancel,
  onCancelAndEdit,
  isDraft = false,
  isProforma = false,
  isShiftingToProforma = false,
  generatingPdf = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMoveToProforma = () => {
    if (onMoveToProforma) {
      onMoveToProforma();
    }
    setIsOpen(false);
  };

  const handleDownloadPdf = () => {
    if (onDownloadPdf) {
      onDownloadPdf();
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel('cancel');
    }
    setIsOpen(false);
  };

  const handleCancelAndEdit = () => {
    if (onCancelAndEdit) {
      onCancelAndEdit('cancelAndEdit');
    }
    setIsOpen(false);
  };

  // Determine which items to show
  const menuItems = [];
  if (isDraft) {
    menuItems.push({
      label: isShiftingToProforma ? "Moving to Proforma..." : "Move to Proforma",
      onClick: handleMoveToProforma,
      disabled: isShiftingToProforma,
      className: "rounded-t-lg"
    });
  }
  
  menuItems.push({
    label: generatingPdf ? "Generating PDF..." : "Download PDF",
    onClick: handleDownloadPdf,
    disabled: generatingPdf,
    className: isDraft ? "" : "rounded-t-lg"
  });

  if (isProforma) {
    menuItems.push({
      label: "Cancel",
      onClick: handleCancel,
      className: ""
    });
    menuItems.push({
      label: "Cancel and Edit",
      onClick: handleCancelAndEdit,
      className: "rounded-b-lg"
    });
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Show more options"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
          />
        </svg>
      </button>

      {isOpen && menuItems.length > 0 && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {menuItems.map((item, index) => (
            <button
              key={index}
              type="button"
              onClick={item.onClick}
              disabled={item.disabled}
              className={`w-full text-sm text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                index === 0 && item.className.includes('rounded-t') ? item.className :
                index === menuItems.length - 1 && item.className.includes('rounded-b') ? item.className :
                ''
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
