import type { components } from "@/lib/api/schema";

/** The signed-in user (GET /user, auth responses). Generated from the API spec. */
export type User = components["schemas"]["UserResource"];
