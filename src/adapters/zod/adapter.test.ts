/**
 * Tests for adapters/zod — Zod Validation Adapter (Zod 4.x).
 *
 * Covers:
 * - Translating Zod schemas to workbook validation definitions
 * - Direct validation via Zod schemas
 * - Error message mapping (ZodIssue → string)
 * - Handling of nested/refined/transformed schemas
 * - Integration with core validation engine
 */

import { describe, expect, it } from "vitest";
import type { ZodIssue } from "zod";
import { z } from "zod";
import { validateWithZod, zodErrorToMessage, zodToWorkbookValidations } from "./adapter";

// ---------- tests ----------

describe("zodErrorToMessage", () => {
  it("preserves the issue's own message by default", () => {
    const msg = zodErrorToMessage({
      origin: "string",
      code: "too_small",
      minimum: 1,
      inclusive: true,
      path: ["name"],
      message: "Required",
    } as ZodIssue);
    expect(msg).toBe("name: Required");
  });

  it("prepends the field path", () => {
    const msg = zodErrorToMessage({
      origin: "string",
      code: "too_small",
      minimum: 3,
      inclusive: true,
      path: ["user", "name"],
      message: "Name must be at least 3 characters",
    } as ZodIssue);
    expect(msg).toBe("user.name: Name must be at least 3 characters");
  });

  it("omits path when includePath is false", () => {
    const msg = zodErrorToMessage(
      {
        origin: "string",
        code: "too_small",
        minimum: 3,
        inclusive: true,
        path: ["name"],
        message: "Too short",
      } as ZodIssue,
      { includePath: false },
    );
    expect(msg).toBe("Too short");
  });

  it("uses custom message map override", () => {
    const msg = zodErrorToMessage(
      {
        origin: "string",
        code: "too_small",
        minimum: 5,
        inclusive: true,
        path: ["password"],
        message: "String must contain at least 5 character(s)",
      } as ZodIssue,
      {
        messageMap: { too_small: "This field is too short" },
      },
    );
    expect(msg).toBe("password: This field is too short");
  });

  it("handles empty path gracefully", () => {
    const msg = zodErrorToMessage({
      origin: "string",
      code: "invalid_format",
      format: "email",
      path: [],
      message: "Invalid email",
    } as ZodIssue);
    expect(msg).toBe("Invalid email");
  });
});

describe("validateWithZod", () => {
  const userSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    age: z.number().min(18, "Must be at least 18"),
    email: z.string().email("Invalid email address"),
  });

  it("returns undefined for valid data", async () => {
    const result = await validateWithZod(userSchema, {
      name: "John",
      age: 25,
      email: "john@example.com",
    });
    expect(result).toBeUndefined();
  });

  it("returns first error message for invalid data", async () => {
    const result = await validateWithZod(userSchema, {
      name: "J",
      age: 15,
      email: "not-an-email",
    });
    expect(result).toBeDefined();
    expect(result).toContain("name:");
    expect(result).toContain("at least 2");
  });

  it("handles async refinements", async () => {
    const asyncSchema = z.object({
      username: z.string().superRefine(async (val, ctx) => {
        if (val === "taken") {
          ctx.addIssue({
            code: "custom",
            message: "Username is already taken",
          });
        }
      }),
    });

    const result = await validateWithZod(asyncSchema, {
      username: "taken",
    });
    expect(result).toContain("Username is already taken");
  });

  it("handles optional fields correctly", async () => {
    const optionalSchema = z.object({
      name: z.string().optional(),
      bio: z.string().max(100).optional(),
    });

    const result = await validateWithZod(optionalSchema, {});
    expect(result).toBeUndefined();
  });

  it("formats nested path in error message", async () => {
    const nestedSchema = z.object({
      user: z.object({
        name: z.string().min(1, "Name is required"),
      }),
    });

    const result = await validateWithZod(nestedSchema, {
      user: { name: "" },
    });
    expect(result).toContain("user.name");
    expect(result).toContain("Name is required");
  });
});

describe("zodToWorkbookValidations", () => {
  it("converts a simple string schema with min(1)", () => {
    const validations = zodToWorkbookValidations(z.string().min(1, "Required"));
    expect(validations.length).toBeGreaterThanOrEqual(1);
    const requiredVal = validations.find((v) => v.type === "required");
    expect(requiredVal).toBeDefined();
    expect(requiredVal?.message).toBe("Required");
  });

  it("converts a number schema with min/max", () => {
    const validations = zodToWorkbookValidations(z.number().min(0, "Min 0").max(100, "Max 100"));
    expect(validations.length).toBeGreaterThanOrEqual(2);
    const types = validations.map((v) => v.type);
    expect(types).toContain("min");
    expect(types).toContain("max");
  });

  it("returns empty array for z.any()", () => {
    const validations = zodToWorkbookValidations(z.any());
    expect(validations).toHaveLength(0);
  });

  it("converts z.enum to enum validation", () => {
    const validations = zodToWorkbookValidations(z.enum(["admin", "user", "guest"]));
    const enumVal = validations.find((v) => v.type === "enum");
    expect(enumVal).toBeDefined();
    expect(enumVal?.params).toBeDefined();
  });

  it("converts z.literal", () => {
    const validations = zodToWorkbookValidations(z.literal("fixed"));
    expect(validations.length).toBeGreaterThanOrEqual(1);
    expect(validations[0].type).toBe("pattern");
  });

  it("handles optional schemas (no required)", () => {
    const validations = zodToWorkbookValidations(z.string().optional());
    const requiredVal = validations.find((v) => v.type === "required");
    expect(requiredVal).toBeUndefined();
  });
});
