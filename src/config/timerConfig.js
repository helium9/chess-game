export const TIMER_CONFIG = {
  DEFAULT: "BLITZ_3",

  TIME_CONTROLS: {
    BULLET_1: {
      value: 60000, // 1 minute in ms
      label: "1 min",
      category: "Bullet",
    },
    BLITZ_3: {
      value: 180000, // 3 minutes in ms
      label: "3 min",
      category: "Blitz",
    },
    BLITZ_5: {
      value: 300000, // 5 minutes in ms
      label: "5 min",
      category: "Blitz",
    },
    RAPID_10: {
      value: 600000, // 10 minutes in ms
      label: "10 min",
      category: "Rapid",
    },
    RAPID_15: {
      value: 900000, // 15 minutes in ms
      label: "15 min",
      category: "Rapid",
    },
    RAPID_30: {
      value: 1800000, // 30 minutes in ms
      label: "30 min",
      category: "Rapid",
    },
  },

  // Helper function to get time value from control name
  getTimeValue: (controlName) => {
    return (
      TIMER_CONFIG.TIME_CONTROLS[controlName]?.value ||
      TIMER_CONFIG.TIME_CONTROLS[TIMER_CONFIG.DEFAULT].value
    );
  },
};
