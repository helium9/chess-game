import React from "react";

/**
 * StatusMessage component - displays current game status
 */
const StatusMessage = ({ message }) => {
  return (
    <div className="mb-6 px-6 py-3 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 backdrop-blur-sm rounded-xl border border-amber-400/30 shadow-xl min-h-12 flex items-center">
      <p className="text-xl font-semibold text-amber-200 text-center w-full drop-shadow-lg">
        {message}
      </p>
    </div>
  );
};

export default StatusMessage;
