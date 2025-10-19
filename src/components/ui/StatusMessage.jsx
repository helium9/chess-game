import React from "react";

/**
 * StatusMessage component - displays current game status
 */
const StatusMessage = ({ message }) => {
  return (
    <div className="mb-3 sm:mb-4 md:mb-6 px-3 py-2 sm:px-4 sm:py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 backdrop-blur-sm rounded-lg sm:rounded-xl border border-amber-400/30 shadow-xl min-h-10 sm:min-h-12 flex items-center max-w-full mx-2">
      <p className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-amber-200 text-center w-full drop-shadow-lg break-words">
        {message}
      </p>
    </div>
  );
};

export default StatusMessage;
