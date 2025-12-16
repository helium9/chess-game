import React from 'react';

const RematchDialog = ({ isOpen, onAccept, onDecline, requestFrom }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900 border-2 border-amber-500/50 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -ml-16 -mb-16"></div>
        
        <h2 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-400 mb-4 text-center relative z-10">
          Rematch Requested!
        </h2>
        
        <p className="text-gray-300 text-center mb-8 relative z-10 text-lg">
          <span className="font-semibold text-amber-400">
            {requestFrom === 'white' ? 'White' : 'Black'}
          </span>
          {' '}wants to play again.
        </p>

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
