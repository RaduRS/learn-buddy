export type Bin = "blue" | "gold";
export type Condition = "star" | "circle" | "red" | "purple" | "red-and-star" | "purple-and-circle" | "red-or-star" | "purple-or-circle";

type Parcel = { colour: "red" | "purple"; shape: "star" | "circle" };

export const PARCELS: readonly Parcel[] = [
  { colour: "red", shape: "star" }, { colour: "red", shape: "circle" },
  { colour: "purple", shape: "star" }, { colour: "purple", shape: "circle" },
];

export const CONDITION_LABELS: Record<Condition, string> = {
  star: "Is a star", circle: "Is a circle", red: "Is red", purple: "Is purple",
  "red-and-star": "Is red AND a star", "purple-and-circle": "Is purple AND a circle",
  "red-or-star": "Is red OR a star", "purple-or-circle": "Is purple OR a circle",
};

export interface RobotJob {
  instruction: string;
  conditions: readonly Condition[];
  targets: readonly Bin[];
}

export type RobotProgram = { condition: Condition; then: Bin; else: Bin };

export const ROBOT_JOBS: readonly RobotJob[] = [
  { instruction: "Stars go in the blue bin. Circles go in the gold bin.", conditions: ["red", "star", "circle"], targets: ["blue", "gold", "blue", "gold"] },
  { instruction: "Purple parcels go in the gold bin. Red parcels go in the blue bin.", conditions: ["purple", "circle", "red"], targets: ["blue", "blue", "gold", "gold"] },
  { instruction: "Circles go in the blue bin. Stars go in the gold bin.", conditions: ["star", "purple", "circle"], targets: ["gold", "blue", "gold", "blue"] },
  { instruction: "Red parcels go in the gold bin. Purple parcels go in the blue bin.", conditions: ["circle", "red", "purple"], targets: ["gold", "gold", "blue", "blue"] },
  { instruction: "Only red stars go in the blue bin. Everything else goes in the gold bin.", conditions: ["red", "star", "red-and-star", "purple-and-circle"], targets: ["blue", "gold", "gold", "gold"] },
  { instruction: "Only purple circles go in the gold bin. Everything else goes in the blue bin.", conditions: ["purple-and-circle", "circle", "purple", "red-and-star"], targets: ["blue", "blue", "blue", "gold"] },
  { instruction: "Put a parcel in the blue bin if it is red, a star, or both. Everything else goes in the gold bin.", conditions: ["star", "red-and-star", "red-or-star", "red"], targets: ["blue", "blue", "blue", "gold"] },
  { instruction: "Put a parcel in the gold bin if it is purple, a circle, or both. Everything else goes in the blue bin.", conditions: ["purple-and-circle", "purple", "circle", "purple-or-circle"], targets: ["blue", "gold", "gold", "gold"] },
];

const matches: Record<Condition, (parcel: Parcel) => boolean> = {
  star: ({ shape }) => shape === "star",
  circle: ({ shape }) => shape === "circle",
  red: ({ colour }) => colour === "red",
  purple: ({ colour }) => colour === "purple",
  "red-and-star": ({ colour, shape }) => colour === "red" && shape === "star",
  "purple-and-circle": ({ colour, shape }) => colour === "purple" && shape === "circle",
  "red-or-star": ({ colour, shape }) => colour === "red" || shape === "star",
  "purple-or-circle": ({ colour, shape }) => colour === "purple" || shape === "circle",
};

export function runRobotProgram(program: RobotProgram): Bin[] {
  return PARCELS.map((parcel) => matches[program.condition](parcel) ? program.then : program.else);
}
