// /components/Timer.js
import React, { useState, useEffect } from "react";

const Timer = ({ duration = 60, onTimeUp }) => {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUp();
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft, onTimeUp]);

  return (
    <div className="text-2xl font-bold">
      Time Left: {timeLeft}s
    </div>
  );
};

export default Timer;
