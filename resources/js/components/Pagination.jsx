import React from 'react';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiChevronLeft, FiChevronRight } = FiIcons;

function Pagination({ currentPage, totalPages, totalEntries, itemsPerPage, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="px-8 py-6 bg-gray-50/30 border-t border-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest order-2 sm:order-1">
        Showing {Math.min(totalEntries, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(totalEntries, currentPage * itemsPerPage)} of {totalEntries} entries
      </p>
      <div className="flex items-center gap-2 order-1 sm:order-2">
        <button 
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className={`p-2 rounded-xl transition-all ${currentPage === 1 ? 'text-gray-200 cursor-not-allowed' : 'text-[#4a5a67] hover:bg-[#ebc1b6]/20'}`}
        >
          <SafeIcon icon={FiChevronLeft} />
        </button>
        
        <div className="flex items-center gap-1">
          {[...Array(totalPages)].map((_, i) => {
            const page = i + 1;
            // Show only first, last, and pages around current
            if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
              return (
                <button 
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`w-8 h-8 rounded-xl text-[10px] font-black transition-all ${
                    currentPage === page 
                      ? 'bg-[#4a5a67] text-[#ebc1b6] shadow-md' 
                      : 'text-gray-400 hover:bg-gray-100'
                  }`}
                >
                  {page}
                </button>
              );
            } else if (page === currentPage - 2 || page === currentPage + 2) {
              return <span key={page} className="text-gray-300">...</span>;
            }
            return null;
          })}
        </div>

        <button 
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className={`p-2 rounded-xl transition-all ${currentPage === totalPages ? 'text-gray-200 cursor-not-allowed' : 'text-[#4a5a67] hover:bg-[#ebc1b6]/20'}`}
        >
          <SafeIcon icon={FiChevronRight} />
        </button>
      </div>
    </div>
  );
}

export default Pagination;
