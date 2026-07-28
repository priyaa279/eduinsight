// Blind #9 deliberately reuses the independent arithmetic oracle that was
// sealed before this question set existed. The dependency is included in the
// Blind #9 seal so its calculations cannot change between sealing and run.
export * from "./blind-8-oracle.mjs";
