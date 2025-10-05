import { COLORS } from "../../utils/constants.js";

/**
 * Message helper functions for consistent game state announcements
 */

export const capitalizeColor = (color) => {
  return color === COLORS.WHITE ? "White" : "Black";
};

export const announceTurn = (turn) => {
  return `${capitalizeColor(turn)} to move`;
};

export const announceError = (msg) => {
  return msg;
};

export const announceSuccess = (msg) => {
  return msg;
};
