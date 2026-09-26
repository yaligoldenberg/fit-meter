import { Locale } from "./i18n";

/**
 * Error messages returned by API routes, in the participant's language.
 *
 * These live apart from the UI catalogue in ./i18n because they're produced on the
 * server and rendered verbatim by whatever client made the call — a Hebrew-speaking
 * participant should never see "Unauthorized" inside an otherwise Hebrew screen.
 */
const API_ERRORS = {
  unauthorized: { he: "נדרשת התחברות", en: "Unauthorized" },
  not_found: { he: "לא נמצא", en: "Not found" },
  invalid_input: { he: "קלט לא תקין", en: "Invalid input" },
  invalid_date: { he: "תאריך לא תקין", en: "Invalid date" },
  date_out_of_range: {
    he: "אפשר לרשום אימון מהיום ועד שנה אחורה",
    en: "Workouts can be dated from today back to a year ago",
  },
  invalid_action: { he: "פעולה לא חוקית", en: "Invalid action" },
  invalid_preferences: { he: "העדפות לא תקינות", en: "Invalid preferences" },
  nothing_to_update: { he: "אין מה לעדכן", en: "Nothing to update" },

  email_taken: { he: 'הדוא"ל כבר רשום', en: "Email already registered" },
  username_taken: { he: "שם המשתמש תפוס", en: "Username taken" },
  username_invalid: {
    he: "שם משתמש: 3–20 תווים, אותיות באנגלית, ספרות וקו תחתון בלבד",
    en: "Username: 3–20 characters, letters, numbers and underscores only",
  },
  display_name_invalid: { he: "שם לתצוגה: 1–40 תווים", en: "Display name: 1–40 characters" },
  credentials_missing: {
    he: 'הזינו שם משתמש או דוא"ל וסיסמה',
    en: "Enter your username/email and password",
  },
  credentials_wrong: {
    he: 'שם משתמש/דוא"ל או סיסמה שגויים',
    en: "Incorrect username/email or password",
  },
  gender_required: { he: "יש לבחור מין", en: "Gender is required" },
  email_invalid: { he: 'כתובת הדוא"ל אינה תקינה', en: "That email address isn't valid" },
  password_too_long: { he: "הסיסמה ארוכה מדי (עד 72 תווים)", en: "Password is too long (72 characters max)" },
  too_many_attempts: {
    he: "יותר מדי ניסיונות התחברות. נסו שוב בעוד כמה דקות",
    en: "Too many sign-in attempts. Try again in a few minutes",
  },

  username_missing: { he: "הזינו שם משתמש", en: "Enter a username" },
  no_such_user: { he: "אין משתמש עם השם הזה", en: "No user with that username" },
  cannot_add_self: { he: "אי אפשר להוסיף את עצמך", en: "You can't add yourself" },
  request_already_sent: { he: "הבקשה כבר נשלחה", en: "Request already sent" },
  already_friends: { he: "אתם כבר חברים", en: "You're already friends" },

  group_name_required: { he: "הזינו שם לקבוצה", en: "Enter a group name" },
  group_limit_reached: { he: "הגעתם למקסימום הקבוצות", en: "You've reached the group limit" },
  group_code_invalid: { he: "קוד הצטרפות אינו תקין", en: "That join code isn't valid" },
  group_not_found: { he: "לא נמצאה קבוצה עם הקוד הזה", en: "No group with that code" },
  group_already_member: { he: "אתם כבר בקבוצה הזו", en: "You're already in this group" },
  group_full: { he: "הקבוצה מלאה", en: "That group is full" },
  group_not_owner: { he: "רק מנהל הקבוצה יכול לעשות זאת", en: "Only the group owner can do that" },
  group_cannot_remove_self: { he: "כדי לעזוב, השתמשו ביציאה מהקבוצה", en: "Use Leave group instead" },

  reset_invalid: { he: "קישור האיפוס אינו תקין", en: "That reset link isn't valid" },
  reset_expired: { he: "קישור האיפוס פג תוקף", en: "That reset link has expired" },
  reset_used: { he: "כבר נעשה שימוש בקישור הזה", en: "That reset link was already used" },
  password_too_short: { he: "הסיסמה חייבת להכיל 6 תווים לפחות", en: "Password must be at least 6 characters" },
} as const;

export type ApiErrorKey = keyof typeof API_ERRORS;

/** Message for an API error in the given language; defaults to Hebrew, the study's default. */
export function apiError(key: ApiErrorKey, locale: Locale = "he"): string {
  return API_ERRORS[key][locale];
}
