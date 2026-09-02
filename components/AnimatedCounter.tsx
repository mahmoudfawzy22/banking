"use client";
import React from "react";
import CountUp from "react-countup";
function AnimatedCounter({ amount }: { amount: number }) {
  return <CountUp end={amount} decimal="," prefix="$" />;
}

export default AnimatedCounter;
