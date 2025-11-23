"use client";

import React from "react";
import { PIECE_SYMBOLS } from "../../utils/constants.js";

/**
 * PromotionDialog component - displays promotion piece selection
 */
const PromotionDialog = ({ isOpen, currentTurn, onPromote }) => {
  if (!isOpen) return null;

  return (
    <div
      className="mt-4 sm:mt-6 px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6 bg-gradient-to-br from-purple-700 via-purple-800 to-indigo-900 text-white rounded-xl sm:rounded-2xl shadow-2xl border-2 border-purple-400 max-w-xs sm:max-w-md md:max-w-lg mx-auto backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="promotion-dialog-title"
    >
      <h3
        id="promotion-dialog-title"
        className="text-center mb-3 sm:mb-4 text-lg sm:text-xl font-bold"
      >
        Promote Your Pawn
      </h3>
      <p className="text-center mb-4 sm:mb-6 text-sm sm:text-base text-purple-200">
        Choose piece to promote:
      </p>
      <div className="flex gap-2 sm:gap-3 md:gap-4 justify-center flex-wrap">
        <button
          onClick={() => onPromote(currentTurn === "white" ? "Q" : "q")}
          autoFocus
          className="px-4 py-3 sm:px-5 sm:py-3.5 md:px-6 md:py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-bold rounded-lg sm:rounded-xl shadow-xl transition-all transform hover:scale-110 active:scale-95 focus:ring-2 sm:focus:ring-4 focus:ring-yellow-400 text-2xl sm:text-3xl md:text-4xl"
          aria-label="Promote to Queen"
        >
          {currentTurn === "white" ? "♕" : "♛"}
        </button>
        <button
          onClick={() => onPromote(currentTurn === "white" ? "R" : "r")}
          className="px-4 py-3 sm:px-5 sm:py-3.5 md:px-6 md:py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-lg sm:rounded-xl shadow-xl transition-all transform hover:scale-110 active:scale-95 focus:ring-2 sm:focus:ring-4 focus:ring-blue-400 text-2xl sm:text-3xl md:text-4xl"
          aria-label="Promote to Rook"
        >
          {currentTurn === "white" ? "♖" : "♜"}
        </button>
        <button
          onClick={() => onPromote(currentTurn === "white" ? "B" : "b")}
          className="px-4 py-3 sm:px-5 sm:py-3.5 md:px-6 md:py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-lg sm:rounded-xl shadow-xl transition-all transform hover:scale-110 active:scale-95 focus:ring-2 sm:focus:ring-4 focus:ring-green-400 text-2xl sm:text-3xl md:text-4xl"
          aria-label="Promote to Bishop"
        >
          {currentTurn === "white" ? "♗" : "♝"}
        </button>
        <button
          onClick={() => onPromote(currentTurn === "white" ? "N" : "n")}
          className="px-4 py-3 sm:px-5 sm:py-3.5 md:px-6 md:py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-lg sm:rounded-xl shadow-xl transition-all transform hover:scale-110 active:scale-95 focus:ring-2 sm:focus:ring-4 focus:ring-red-400 text-2xl sm:text-3xl md:text-4xl"
          aria-label="Promote to Knight"
        >
          {currentTurn === "white" ? "♘" : "♞"}
        </button>
      </div>
    </div>
  );
};

export default PromotionDialog;
