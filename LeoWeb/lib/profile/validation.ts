import { z } from "zod"
import { locales } from "@/lib/i18n"
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
export const profileInput = z
  .object({
    nickname: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .refine((v) => !/[\u0000-\u001f\u007f]/.test(v)),
    sex: optionalText(50),
    birthDate: z
      .string()
      .refine(
        (v) =>
          !v ||
          (/^\d{4}-\d{2}-\d{2}$/.test(v) &&
            !Number.isNaN(Date.parse(v)) &&
            new Date(v).toISOString().slice(0, 10) === v &&
            v >= "1900-01-01" &&
            v <= new Date().toISOString().slice(0, 10))
      )
      .transform((v) => v || null),
    height: z
      .string()
      .trim()
      .refine(
        (v) =>
          !v ||
          (/^\d{1,5}(\.\d{1,2})?$/.test(v) &&
            Number(v) > 0 &&
            Number(v) <= 99999.99)
      )
      .transform((v) => v || null),
    heightUnit: z
      .union([z.enum(["cm", "m", "in", "ft"]), z.literal("")])
      .transform((v) => v || null),
    country: z
      .string()
      .trim()
      .toUpperCase()
      .refine((v) => !v || /^[A-Z]{2}$/.test(v))
      .transform((v) => v || null),
    city: optionalText(100),
    timezone: z
      .string()
      .trim()
      .max(100)
      .refine((v) => {
        if (!v) return true
        try {
          new Intl.DateTimeFormat("en", { timeZone: v })
          return true
        } catch {
          return false
        }
      })
      .transform((v) => v || null),
  })
  .transform((v) => (v.height ? v : { ...v, heightUnit: null }))
  .refine((v) => Boolean(v.height) === Boolean(v.heightUnit), {
    path: ["height"],
    message: "heightUnit",
  })
export const settingsInput = z.object({
  language: z.enum(locales),
  weightMeasureUnit: z.enum(["kg", "lb"]),
  lengthMeasureUnit: z.enum(["cm", "m", "in", "ft"]),
})
export const passwordInput = z
  .object({
    currentPassword: z.string().max(128),
    password: z
      .string()
      .min(12)
      .max(128)
      .refine((v) => v.trim().length > 0),
    confirmPassword: z.string().max(128),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
  })
