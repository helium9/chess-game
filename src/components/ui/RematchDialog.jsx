import React from "react";
import { TIMER_CONFIG } from "../../config/timerConfig";

const RematchDialog = ({
  isOpen,
  onAccept,
  onDecline,
  requestFrom,
  proposedTimer,
}) => {
  if (!isOpen) return null;

  // Format timer display using labels from TIMER_CONFIG
  const getTimerDisplay = (timer) => {
    if (!timer) return null;

    // Get label from TIMER_CONFIG
    const timerConfig = TIMER_CONFIG.TIME_CONTROLS[timer];
    if (timerConfig) {
      return timerConfig.label;
    }

    // Fallback: return the timer key itself if not found in config
    return timer;
  };

  const timerDisplay = getTimerDisplay(proposedTimer);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900 border-2 border-amber-500/50 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -ml-16 -mb-16"></div>

        <h2 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-400 mb-4 text-center relative z-10">
          Rematch Requested!
        </h2>

        <p className="text-gray-300 text-center mb-2 relative z-10 text-lg">
          <span className="font-semibold text-amber-400">
            {requestFrom === "white" ? "White" : "Black"}
          </span>{" "}
          wants to play again.
        </p>

        {/* Display proposed timer if available */}
        {timerDisplay && (
          <p className="text-center mb-6 relative z-10">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600/30 rounded-lg border border-purple-500/50">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-purple-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-purple-300 font-medium">
                Proposed timer:{" "}
              </span>
              <span className="text-white font-bold">{timerDisplay}</span>
            </span>
          </p>
        )}

        {!timerDisplay && <div className="mb-6"></div>}

        <div className="flex gap-4 justify-center relative z-10">
          <button
            onClick={onDecline}
            className="px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 transform hover:scale-105 transition-all duration-200 shadow-lg"
          >
            Decline
          </button>

          <button
            onClick={onAccept}
            className="px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 transform hover:scale-105 transition-all duration-200 shadow-lg shadow-green-500/20"
          >
            Accept Rematch
          </button>
        </div>
      </div>
    </div>
  );
};

export default RematchDialog;
