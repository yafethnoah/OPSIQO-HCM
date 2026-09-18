import type { ReactNode } from "react";
import Svg, { Circle, Line, Path } from "react-native-svg";

export type PulseTabIconName =
  | "home"
  | "time"
  | "requests"
  | "inbox"
  | "me";

type Props = {
  name: PulseTabIconName;
  color: string;
  size: number;
};

export function PulseTabIcon({ name, color, size }: Props) {
  const common = {
    stroke: color,
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };

  let body: ReactNode;

  if (name === "home") {
    body = (
      <>
        <Path d="M3.5 10.5 12 3.5l8.5 7" {...common} />
        <Path d="M5.5 9.5V20h13V9.5" {...common} />
        <Path d="M9.5 20v-6h5v6" {...common} />
      </>
    );
  } else if (name === "time") {
    body = (
      <>
        <Circle cx="12" cy="12" r="8.5" {...common} />
        <Line x1="12" y1="12" x2="12" y2="7" {...common} />
        <Line x1="12" y1="12" x2="16" y2="14" {...common} />
      </>
    );
  } else if (name === "requests") {
    body = (
      <>
        <Line x1="12" y1="5" x2="12" y2="19" {...common} />
        <Line x1="5" y1="12" x2="19" y2="12" {...common} />
      </>
    );
  } else if (name === "inbox") {
    body = (
      <>
        <Path d="M4 5.5h16v13H4z" {...common} />
        <Path d="m4.5 7 7.5 6 7.5-6" {...common} />
      </>
    );
  } else {
    body = (
      <>
        <Circle cx="12" cy="8" r="3.2" {...common} />
        <Path d="M5.5 20c.6-4 3-6 6.5-6s5.9 2 6.5 6" {...common} />
      </>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {body}
    </Svg>
  );
}