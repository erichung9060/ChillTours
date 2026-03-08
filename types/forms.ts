import { z } from "zod";

// ============================================================================
// Schema Factory Types
// ============================================================================

export type TranslationFunction = (key: string) => string;

// ============================================================================
// Landing Page Data Forms
// ============================================================================

export const createTripFormSchema = (t: TranslationFunction) =>
  z
    .object({
      destination: z.string().min(1, t("validation.destinationRequired")),
      dates: z.object(
        {
          from: z.date({
            message: t("validation.startDateRequired"),
          }),
          to: z
            .date({
              message: t("validation.endDateRequired"),
            })
            .optional(),
        },
        { message: t("validation.datesRequired") }
      ),
      vibe: z.string().optional(),
    })
    .refine(
      (data) => {
        // Must have both from and to dates
        return data.dates.from && data.dates.to;
      },
      {
        message: t("validation.bothDatesRequired"),
        path: ["dates"],
      }
    )
    .refine(
      (data) => {
        if (data.dates.from && data.dates.to) {
          return data.dates.to >= data.dates.from;
        }
        return true;
      },
      {
        message: t("validation.endDateAfterStart"),
        path: ["dates"],
      }
    );

export type TripFormValues = z.infer<ReturnType<typeof createTripFormSchema>>;

// ============================================================================
// Planner Metadata Forms
// ============================================================================

export const createEditMetadataFormSchema = (t: TranslationFunction) =>
  z
    .object({
      title: z
        .string()
        .min(1, t("validation.titleRequired"))
        .max(100, t("validation.titleMaxLength")),
      destination: z
        .string()
        .min(1, t("validation.destinationRequired"))
        .max(100, t("validation.destinationMaxLength")),
      dates: z.object(
        {
          from: z.date({
            message: t("validation.startDateRequired"),
          }),
          to: z
            .date({
              message: t("validation.endDateRequired"),
            })
            .optional(),
        },
        { message: t("validation.datesRequired") }
      ),
      requirements: z.string().optional(),
    })
    .refine(
      (data) => {
        return data.dates.from && data.dates.to;
      },
      {
        message: t("validation.bothDatesRequired"),
        path: ["dates"],
      }
    )
    .refine(
      (data) => {
        if (data.dates.from && data.dates.to) {
          return data.dates.to >= data.dates.from;
        }
        return true;
      },
      {
        message: t("validation.endDateAfterStart"),
        path: ["dates"],
      }
    );

export type EditMetadataFormValues = z.infer<
  ReturnType<typeof createEditMetadataFormSchema>
>;

// ============================================================================
// Planner Activity Forms
// ============================================================================

export const createActivityFormSchema = (t: TranslationFunction) =>
  z.object({
    title: z
      .string()
      .min(1, t("validation.activityTitleRequired"))
      .max(100, t("validation.activityTitleMaxLength")),
    locationName: z.string().min(1, t("validation.locationRequired")),
    time: z
      .string()
      .regex(
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        t("validation.timeInvalidFormat")
      ),
    duration: z.coerce
      .number()
      .int()
      .min(1, t("validation.durationMin"))
      .max(480, t("validation.durationMax")),
    url: z
      .union([z.literal(""), z.string().url(t("validation.invalidUrl"))])
      .optional(),
    note: z.string().max(500, t("validation.noteMaxLength")).optional(),
  });

export type ActivityFormValues = z.infer<
  ReturnType<typeof createActivityFormSchema>
>;
