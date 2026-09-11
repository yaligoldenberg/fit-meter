/**
 * Tiny bilingual layer — Hebrew (default, RTL) and English.
 *
 * No i18n library: the app has a few dozen strings, and a plain dictionary keeps
 * every translation visible in one file and costs nothing at runtime. Hebrew is
 * grammatically gendered, so strings that describe the user come in F/M variants
 * (see `tg`); everything else is a single string per locale.
 */

export type Locale = "he" | "en";
export type Gender = "F" | "M";

export const LOCALES: Locale[] = ["he", "en"];
export const DEFAULT_LOCALE: Locale = "he";
export const LOCALE_COOKIE = "fm_locale";

export function isLocale(value: unknown): value is Locale {
  return value === "he" || value === "en";
}

export function dirFor(locale: Locale): "rtl" | "ltr" {
  return locale === "he" ? "rtl" : "ltr";
}

/** Gendered string: [feminine, masculine]. Unknown gender falls back to masculine, the Hebrew default. */
type G = [string, string];

function pick(pair: G, gender: Gender | null | undefined): string {
  return gender === "F" ? pair[0] : pair[1];
}

const STRINGS = {
  he: {
    appName: "FitMeter",
    nav_dashboard: "לוח בקרה",
    nav_leaderboard: "טבלה",
    nav_history: "היסטוריה",
    nav_friends: "חברים",
    nav_logout: "התנתקות",

    score_label: "ציון כושר · 7 ימים אחרונים",
    stat_active_days: "ימים פעילים",
    stat_total_minutes: 'סה"כ דקות',
    stat_workouts: "אימונים",
    stat_effort: "מאמץ",
    stat_hardest: "האימון הקשה ביותר",
    bar_volume: "נפח",
    bar_consistency: "עקביות",
    bar_variety: "גיוון",

    log_workout: "רישום אימון",
    last_7_days: "7 הימים האחרונים",
    field_type: "סוג",
    field_duration: "משך (דקות)",
    field_distance: 'מרחק (ק"מ)',
    field_date: "תאריך",
    field_note: "הערה",
    field_intensity: "עצימות",
    field_optional: "לא חובה",
    more: "עוד",
    less: "פחות",
    save_workout: "שמירת אימון",
    saving: "שומר…",
    nothing_logged: "עוד לא נרשם כלום השבוע — קדימה.",

    next_title: "התואר הבא",
    points_away: "נקודות נותרו",
    point_away: "נקודה נותרה",
    top_of_ladder: "בראש הסולם — אין תואר מעל זה",
    route_another_day: "להתאמן ביום נוסף",
    route_new_type: "לרשום סוג אימון אחר",
    route_cardio: (min: number) => `בערך ${min} דקות של קרדיו בינוני`,

    leaderboard_title: "טבלת החברים",
    lb_last_7: "7 ימים אחרונים",
    lb_earlier: "→ 7 ימים קודמים",
    lb_later: "7 ימים אחרי ←",
    lb_effort: "מאמץ",
    lb_alone: "עף לבד",

    register: "הרשמה",
    login: "התחברות",
    field_email: 'דוא"ל',
    field_username: "שם משתמש",
    field_display_name: "שם לתצוגה",
    field_password: "סיסמה",
    field_gender: "מין",
    gender_f: "נקבה",
    gender_m: "זכר",
    gender_why: "נדרש לתארים ולניסוח בעברית",
    gender_missing: "בחר/י מין כדי לקבל את התואר הנכון",

    difficulty_LIGHT: "קל",
    difficulty_MODERATE: "בינוני",
    difficulty_HARD: "קשה",
    difficulty_BRUTAL: "אכזרי",
    difficulty_EPIC: "אפי",

    auth_welcome_back: "טוב לראות אותך",
    auth_join: "מצטרפים ללוח",
    auth_login_sub: "התחברו כדי לראות את הציון של השבוע.",
    auth_register_sub: "פתחו חשבון והתחילו לרשום אימונים.",
    auth_identifier: 'שם משתמש או דוא"ל',
    auth_submit_register: "יצירת חשבון",
    auth_wait: "רגע…",
    auth_new_here: "חדשים כאן?",
    auth_have_one: "כבר יש לכם חשבון?",
    auth_gender_required: "בחרו מין — זה קובע את התואר ואת הניסוח בעברית",
    gender_hint: "קובע את התואר שלך (כוסית / מפלצת) ואת הניסוח בעברית",
    generic_error: "משהו השתבש",
    network_error: "תקלת רשת — נסו שוב",
    land_signup: "הרשמה חינם",
    land_kicker: "כושר שבועי, נמדד בכנות",
    land_h1_a: "תדעו את",
    land_h1_b: "המספר שלכם.",
    land_sub: "רשמו כל ריצה, רכיבה, שחייה ואימון כוח. FitMeter הופך את 7 הימים האחרונים לציון אחד — ומציב אותו ליד של החברים שלכם.",
    land_cta: "לדרג את השבוע שלי ←",
    land_have_account: "כבר יש לי חשבון",
    land_how: "איך זה עובד",
    land_s1_title: "רשמו כל אימון",
    land_s1_body: "ריצה, אופניים, שחייה, כוח, יוגה, טניס, כדורגל — משך ועצימות בעשר שניות.",
    land_s2_title: "קבלו ציון כושר",
    land_s2_body: "נפח, עקביות וגיוון מתגלגלים לציון אחד בין 0 ל-100 — על 7 הימים האחרונים, בכל יום.",
    land_s3_title: "תשוו מול החברים",
    land_s3_body: "מוסיפים חברים לפי שם משתמש ורואים טבלה חיה. אף אחד לא רוצה להיות אחרון.",
    land_squad: "החבורה של השבוע",
    land_preview: "תצוגה מקדימה",
    land_footer: "FitMeter — נבנה כדי לסגור ויכוחים בקבוצה.",
    history_heading: "היסטוריה",
    history_subtitle: "עשרה שבועות של הוכחות. אין לאן להתחבא מהגרף.",
    history_empty_title: "עדיין אין היסטוריה",
    history_empty_body_pre: "רשמו את האימון הראשון שלכם ב",
    history_empty_link: "לוח הבקרה",
    history_empty_body_post: ", וזה יופיע כאן.",
    history_trend_heading: "מגמת 10 שבועות",
    history_recap_heading: "סיכום שבועי",
    history_current: "נוכחי",
    history_full_log_heading: "יומן מלא",
    unit_min: "דק׳",
    unit_km: 'ק"מ',
    friends_heading: "חברים",
    friends_add_heading: "הוספת חבר/ה",
    friends_add_by_username: "לפי שם משתמש",
    friends_username_placeholder: "@שם_משתמש",
    friends_add_button: "הוספה",
    friends_adding: "מוסיף/ה…",
    friends_generic_error: "משהו השתבש",
    friends_now_friends: "עכשיו אתם חברים!",
    friends_request_sent: "הבקשה נשלחה",
    friends_network_error: "שגיאת רשת — נסו שוב",
    loading_ellipsis: "טוען…",
    friends_load_error: "טעינת החברים נכשלה.",
    retry: "נסו שוב",
    friends_requests_heading: "בקשות",
    accept: "אישור",
    decline: "דחייה",
    friends_sent_heading: "נשלחו",
    cancel: "ביטול",
    friends_your_friends_heading: "החברים שלך",
    friends_empty: "עוד אין חברים — הוסיפו אחד למעלה כדי להתחיל טבלת דירוג. יידרש להם חשבון FitMeter עם שם המשתמש שהזנתם.",
    remove: "הסרה",
    lb_alone_hint: "תוסיפו חברים כדי להתחיל תחרות — אף אחד לא רוצה להיות השם היחיד בלוח.",
    add_friends: "הוספת חברים",
    you_marker: "(את/ה)",
    leaderboard_load_error: "לא הצלחנו לטעון את הטבלה. נסו שוב.",
    log_workout_error: "לא הצלחנו לשמור את האימון",
    logged_confirm: "נשמר ✓",
    delete_workout: "מחיקת אימון",
    delete_workout_error: "לא הצלחנו למחוק את האימון",
    lb_days: (n: number) => `${n} ${n === 1 ? "יום" : "ימים"}`,
    lb_workouts: (n: number) => `${n} ${n === 1 ? "אימון" : "אימונים"}`,
    language: "שפה",
  },
  en: {
    appName: "FitMeter",
    nav_dashboard: "Dashboard",
    nav_leaderboard: "Leaderboard",
    nav_history: "History",
    nav_friends: "Friends",
    nav_logout: "Log out",

    score_label: "Fit Score · last 7 days",
    stat_active_days: "Active days",
    stat_total_minutes: "Total minutes",
    stat_workouts: "Workouts",
    stat_effort: "Effort",
    stat_hardest: "Hardest session",
    bar_volume: "Volume",
    bar_consistency: "Consistency",
    bar_variety: "Variety",

    log_workout: "Log a workout",
    last_7_days: "Last 7 days",
    field_type: "Type",
    field_duration: "Duration (min)",
    field_distance: "Distance (km)",
    field_date: "Date",
    field_note: "Note",
    field_intensity: "Intensity",
    field_optional: "optional",
    more: "More",
    less: "Less",
    save_workout: "Save workout",
    saving: "Saving…",
    nothing_logged: "Nothing logged yet this week — get after it.",

    next_title: "Next title",
    points_away: "points away",
    point_away: "point away",
    top_of_ladder: "Top of the ladder — nothing above this one",
    route_another_day: "Train on one more day",
    route_new_type: "Log a different activity type",
    route_cardio: (min: number) => `About ${min} min of moderate cardio`,

    leaderboard_title: "Leaderboard",
    lb_last_7: "Last 7 days",
    lb_earlier: "← Earlier 7 days",
    lb_later: "Later 7 days →",
    lb_effort: "Effort",
    lb_alone: "Flying solo",

    register: "Register",
    login: "Log in",
    field_email: "Email",
    field_username: "Username",
    field_display_name: "Display name",
    field_password: "Password",
    field_gender: "Gender",
    gender_f: "Female",
    gender_m: "Male",
    gender_why: "Used for titles and Hebrew grammar",
    gender_missing: "Pick a gender to get the right title",

    difficulty_LIGHT: "Light",
    difficulty_MODERATE: "Moderate",
    difficulty_HARD: "Hard",
    difficulty_BRUTAL: "Brutal",
    difficulty_EPIC: "Epic",

    auth_welcome_back: "Welcome back",
    auth_join: "Join the board",
    auth_login_sub: "Log in to see this week's score.",
    auth_register_sub: "Create an account and start logging workouts.",
    auth_identifier: "Username or email",
    auth_submit_register: "Create account",
    auth_wait: "One sec…",
    auth_new_here: "New here?",
    auth_have_one: "Already have one?",
    auth_gender_required: "Pick a gender — it sets your title and Hebrew wording",
    gender_hint: "Sets your title (Hottie / Beast) and Hebrew grammar",
    generic_error: "Something went wrong",
    network_error: "Network error — try again",
    land_signup: "Sign up free",
    land_kicker: "Weekly fitness, scored honestly",
    land_h1_a: "Know your",
    land_h1_b: "number.",
    land_sub: "Log every run, ride, swim and lift. FitMeter turns your last 7 days into one score — then puts it next to your friends'.",
    land_cta: "Start scoring my week →",
    land_have_account: "I already have an account",
    land_how: "How it works",
    land_s1_title: "Log every session",
    land_s1_body: "Running, cycling, swimming, lifting, yoga, tennis, football — duration and effort in ten seconds.",
    land_s2_title: "Get a Fit Score",
    land_s2_body: "Volume, consistency and variety roll into one 0–100 score over your last 7 days, updated daily.",
    land_s3_title: "Compare with friends",
    land_s3_body: "Add friends by username and watch a live leaderboard. Nobody wants to be last.",
    land_squad: "This week's squad",
    land_preview: "Preview",
    land_footer: "FitMeter — built to settle the group chat.",
    history_heading: "History",
    history_subtitle: "Ten weeks of receipts. No hiding from the chart.",
    history_empty_title: "No history yet",
    history_empty_body_pre: "Log your first workout from the ",
    history_empty_link: "Dashboard",
    history_empty_body_post: " and it'll show up here.",
    history_trend_heading: "10-week trend",
    history_recap_heading: "Weekly recap log",
    history_current: "Current",
    history_full_log_heading: "Full log",
    unit_min: "min",
    unit_km: "km",
    friends_heading: "Friends",
    friends_add_heading: "Add a friend",
    friends_add_by_username: "By username",
    friends_username_placeholder: "@username",
    friends_add_button: "Add",
    friends_adding: "Adding…",
    friends_generic_error: "Something went wrong",
    friends_now_friends: "You're now friends!",
    friends_request_sent: "Request sent",
    friends_network_error: "Network error — try again",
    loading_ellipsis: "Loading…",
    friends_load_error: "Couldn't load friends.",
    retry: "Retry",
    friends_requests_heading: "Requests",
    accept: "Accept",
    decline: "Decline",
    friends_sent_heading: "Sent",
    cancel: "Cancel",
    friends_your_friends_heading: "Your friends",
    friends_empty: "No friends yet — add one above to start a leaderboard. They'll need a FitMeter account with the username you enter.",
    remove: "Remove",
    lb_alone_hint: "Add friends to start a competition — nobody wants to be the only name on the board.",
    add_friends: "Add friends",
    you_marker: "(you)",
    leaderboard_load_error: "Couldn't load the leaderboard. Try again.",
    log_workout_error: "Couldn't log that workout",
    logged_confirm: "Logged ✓",
    delete_workout: "Delete workout",
    delete_workout_error: "Couldn't delete that workout",
    lb_days: (n: number) => `${n} day${n === 1 ? "" : "s"}`,
    lb_workouts: (n: number) => `${n} workout${n === 1 ? "" : "s"}`,
    language: "Language",
  },
} as const;

export type StringKey = keyof (typeof STRINGS)["en"];

/** Look up a plain string. */
export function t(locale: Locale, key: StringKey): string {
  const value = STRINGS[locale][key];
  return typeof value === "function" ? String(key) : (value as string);
}

/** Look up a string that takes a number, e.g. the cardio route hint. */
export function tn(locale: Locale, key: StringKey, n: number): string {
  const value = STRINGS[locale][key];
  return typeof value === "function" ? (value as (n: number) => string)(n) : (value as string);
}

export { pick as pickGendered };
export type { G as GenderedString };
