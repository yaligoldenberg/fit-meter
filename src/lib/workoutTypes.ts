export type WorkoutTypeKey =
  // Cardio & endurance
  | "RUNNING"
  | "TRAIL_RUNNING"
  | "WALKING"
  | "HIKING"
  | "CYCLING"
  | "SPINNING"
  | "MOUNTAIN_BIKING"
  | "SWIMMING"
  | "ROWING"
  | "ELLIPTICAL"
  | "STAIR_CLIMBER"
  | "JUMP_ROPE"
  | "TRIATHLON"
  // Gym & strength
  | "STRENGTH"
  | "POWERLIFTING"
  | "WEIGHTLIFTING"
  | "CALISTHENICS"
  | "CROSSFIT"
  | "HYROX"
  | "HIIT"
  // Classes & mind-body
  | "AEROBICS"
  | "DANCE"
  | "YOGA"
  | "PILATES"
  | "BARRE"
  | "STRETCHING"
  // Racquet
  | "TENNIS"
  | "PADEL"
  | "SQUASH"
  | "BADMINTON"
  | "TABLE_TENNIS"
  | "PICKLEBALL"
  // Team
  | "SOCCER"
  | "BASKETBALL"
  | "VOLLEYBALL"
  | "HANDBALL"
  | "RUGBY"
  | "HOCKEY"
  // Combat
  | "BOXING"
  | "KICKBOXING"
  | "MARTIAL_ARTS"
  // Outdoor, water & snow
  | "CLIMBING"
  | "SURFING"
  | "SUP"
  | "KAYAKING"
  | "SKATING"
  | "SKIING"
  | "SNOWBOARDING"
  | "GOLF"
  // Catch-alls
  | "SPORT"
  | "OTHER";

/** The headings the sport picker groups its list under when nothing has been typed. */
export type WorkoutCategory =
  | "ENDURANCE"
  | "GYM"
  | "CLASSES"
  | "RACQUET"
  | "TEAM"
  | "COMBAT"
  | "OUTDOOR"
  | "OTHER";

export const WORKOUT_CATEGORY_ORDER: WorkoutCategory[] = [
  "ENDURANCE",
  "GYM",
  "CLASSES",
  "RACQUET",
  "TEAM",
  "COMBAT",
  "OUTDOOR",
  "OTHER",
];

export interface WorkoutTypeMeta {
  label: string;
  labelHe: string;
  icon: string;
  category: WorkoutCategory;
  /**
   * Other words people type for this activity, in either language — nicknames, brands,
   * disciplines folded into it, common misspellings. Search only; never displayed as the
   * name. Both labels are searched too, so they don't need repeating here.
   */
  aliases: string[];
}

// Difficulty is derived from METs in ./difficulty — this table is names, icons and search terms only.
export const WORKOUT_TYPES: Record<WorkoutTypeKey, WorkoutTypeMeta> = {
  RUNNING: {
    label: "Running",
    labelHe: "ריצה",
    icon: "▲",
    category: "ENDURANCE",
    aliases: ["run", "jog", "jogging", "treadmill", "5k", "10k", "marathon", "half marathon", "ג׳וגינג", "הליכון", "מרתון", "חצי מרתון"],
  },
  TRAIL_RUNNING: {
    label: "Trail Running",
    labelHe: "ריצת שטח",
    icon: "△",
    category: "ENDURANCE",
    aliases: ["trail", "cross country", "xc", "ultra", "mountain running", "ריצת הרים", "טרייל"],
  },
  WALKING: {
    label: "Walking",
    labelHe: "הליכה",
    icon: "–",
    category: "ENDURANCE",
    aliases: ["walk", "nordic walking", "power walk", "הליכה נורדית", "צעידה"],
  },
  HIKING: {
    label: "Hiking",
    labelHe: "טיול רגלי",
    icon: "⛰",
    category: "ENDURANCE",
    aliases: ["hike", "trek", "trekking", "backpacking", "טרק", "מסלול", "טיול"],
  },
  CYCLING: {
    label: "Cycling",
    labelHe: "אופניים",
    icon: "●",
    category: "ENDURANCE",
    aliases: ["bike", "biking", "road bike", "road cycling", "gravel", "רכיבה", "אופני כביש"],
  },
  SPINNING: {
    label: "Spinning",
    labelHe: "ספינינג",
    icon: "◉",
    category: "ENDURANCE",
    aliases: ["spin", "spin class", "indoor cycling", "stationary bike", "exercise bike", "peloton", "rpm", "ספין", "אופני כושר", "אופניים נייחים"],
  },
  MOUNTAIN_BIKING: {
    label: "Mountain Biking",
    labelHe: "אופני הרים",
    icon: "◒",
    category: "ENDURANCE",
    aliases: ["mtb", "mountain bike", "enduro", "downhill bike", "אופני שטח", "רכיבת שטח"],
  },
  SWIMMING: {
    label: "Swimming",
    labelHe: "שחייה",
    icon: "≈",
    category: "ENDURANCE",
    aliases: ["swim", "pool", "laps", "open water", "בריכה", "מים פתוחים", "ים"],
  },
  ROWING: {
    label: "Rowing",
    labelHe: "חתירה",
    icon: "⟷",
    category: "ENDURANCE",
    aliases: ["row", "rower", "erg", "indoor rowing", "concept2", "מכונת חתירה", "חותר"],
  },
  ELLIPTICAL: {
    label: "Elliptical",
    labelHe: "אליפטי",
    icon: "◌",
    category: "ENDURANCE",
    aliases: ["cross trainer", "אליפטיקל", "מכשיר אליפטי"],
  },
  STAIR_CLIMBER: {
    label: "Stair Climber",
    labelHe: "מכשיר מדרגות",
    icon: "≡",
    category: "ENDURANCE",
    aliases: ["stairs", "stairmaster", "stepmill", "step machine", "מדרגות", "סטפר"],
  },
  JUMP_ROPE: {
    label: "Jump Rope",
    labelHe: "קפיצה בחבל",
    icon: "∞",
    category: "ENDURANCE",
    aliases: ["skipping", "skip rope", "rope", "double unders", "חבל", "דילוגים"],
  },
  TRIATHLON: {
    label: "Triathlon",
    labelHe: "טריאתלון",
    icon: "∴",
    category: "ENDURANCE",
    aliases: ["tri", "duathlon", "ironman", "brick", "איירונמן", "דואתלון"],
  },

  STRENGTH: {
    label: "Strength",
    labelHe: "כוח",
    icon: "✦",
    category: "GYM",
    aliases: ["gym", "weights", "weight training", "lifting", "resistance", "bodybuilding", "hypertrophy", "dumbbells", "machines", "kettlebell", "trx", "חדר כושר", "מכון", "משקולות", "פיתוח גוף", "בודיבילדינג", "קטלבל"],
  },
  POWERLIFTING: {
    label: "Powerlifting",
    labelHe: "הרמת כוח",
    icon: "■",
    category: "GYM",
    aliases: ["power", "powerlift", "squat", "bench", "deadlift", "sbd", "פאוורליפטינג", "פאוור", "סקוואט", "דדליפט", "לחיצת חזה"],
  },
  WEIGHTLIFTING: {
    label: "Olympic Weightlifting",
    labelHe: "הרמת משקולות אולימפית",
    icon: "⊥",
    category: "GYM",
    aliases: ["weightlifting", "olympic lifting", "oly", "snatch", "clean and jerk", "סנאץ׳", "קלין"],
  },
  CALISTHENICS: {
    label: "Calisthenics",
    labelHe: "קליסטניקס",
    icon: "✳",
    category: "GYM",
    aliases: ["bodyweight", "street workout", "pull ups", "push ups", "משקל גוף", "מתח", "שכיבות סמיכה"],
  },
  CROSSFIT: {
    label: "CrossFit",
    labelHe: "קרוספיט",
    icon: "◈",
    category: "GYM",
    aliases: ["wod", "functional fitness", "metcon", "ווד", "פונקציונלי"],
  },
  HYROX: {
    label: "HYROX",
    labelHe: "היירוקס",
    icon: "▣",
    category: "GYM",
    aliases: ["hyrocks", "hirox", "hyrox race", "fitness racing", "הייירוקס", "הייראקס"],
  },
  HIIT: {
    label: "HIIT",
    labelHe: "אינטרוולים",
    icon: "⨯",
    category: "GYM",
    aliases: ["intervals", "tabata", "circuit", "bootcamp", "f45", "orangetheory", "טבטה", "סירקט", "בוטקמפ"],
  },

  AEROBICS: {
    label: "Aerobics & Step",
    labelHe: "אירוביקה וסטפ",
    icon: "⇡",
    category: "CLASSES",
    aliases: ["aerobic", "step", "step class", "cardio class", "אירובי", "סטפ"],
  },
  DANCE: {
    label: "Dance",
    labelHe: "ריקוד",
    icon: "♪",
    category: "CLASSES",
    aliases: ["zumba", "salsa", "ballet", "hip hop", "dancing", "זומבה", "סלסה", "בלט", "היפ הופ", "מחול"],
  },
  YOGA: {
    label: "Yoga",
    labelHe: "יוגה",
    icon: "○",
    category: "CLASSES",
    aliases: ["vinyasa", "ashtanga", "hatha", "hot yoga", "yin", "ויניאסה", "אשטנגה", "יוגה חמה"],
  },
  PILATES: {
    label: "Pilates",
    labelHe: "פילאטיס",
    icon: "◍",
    category: "CLASSES",
    aliases: ["pilatis", "reformer", "mat pilates", "פילטיס", "רפורמר"],
  },
  BARRE: {
    label: "Barre",
    labelHe: "בארה",
    icon: "‖",
    category: "CLASSES",
    aliases: ["bar", "ballet fitness", "בר"],
  },
  STRETCHING: {
    label: "Stretching & Mobility",
    labelHe: "מתיחות וגמישות",
    icon: "∿",
    category: "CLASSES",
    aliases: ["stretch", "mobility", "flexibility", "foam rolling", "recovery", "מוביליטי", "שחרור"],
  },

  TENNIS: {
    label: "Tennis",
    labelHe: "טניס",
    icon: "◐",
    category: "RACQUET",
    aliases: ["טניס שדה"],
  },
  PADEL: {
    label: "Padel",
    labelHe: "פאדל",
    icon: "◑",
    category: "RACQUET",
    aliases: ["paddle", "פדל"],
  },
  SQUASH: {
    label: "Squash",
    labelHe: "סקווש",
    icon: "◓",
    category: "RACQUET",
    aliases: ["סקוואש"],
  },
  BADMINTON: {
    label: "Badminton",
    labelHe: "בדמינטון",
    icon: "◔",
    category: "RACQUET",
    aliases: ["shuttle", "נוצה"],
  },
  TABLE_TENNIS: {
    label: "Table Tennis",
    labelHe: "טניס שולחן",
    icon: "◕",
    category: "RACQUET",
    aliases: ["ping pong", "pingpong", "פינג פונג"],
  },
  PICKLEBALL: {
    label: "Pickleball",
    labelHe: "פיקלבול",
    icon: "◖",
    category: "RACQUET",
    aliases: ["pickle", "פיקל"],
  },

  SOCCER: {
    label: "Soccer",
    labelHe: "כדורגל",
    icon: "⬢",
    category: "TEAM",
    aliases: ["football", "futsal", "פוטסל", "קטרגל"],
  },
  BASKETBALL: {
    label: "Basketball",
    labelHe: "כדורסל",
    icon: "⬣",
    category: "TEAM",
    aliases: ["hoops", "bball", "סל"],
  },
  VOLLEYBALL: {
    label: "Volleyball",
    labelHe: "כדורעף",
    icon: "⊛",
    category: "TEAM",
    aliases: ["beach volleyball", "כדורעף חופים", "כדור עף"],
  },
  HANDBALL: {
    label: "Handball",
    labelHe: "כדוריד",
    icon: "⊕",
    category: "TEAM",
    aliases: ["כדור יד"],
  },
  RUGBY: {
    label: "Rugby",
    labelHe: "רוגבי",
    icon: "⊖",
    category: "TEAM",
    aliases: ["touch rugby", "american football"],
  },
  HOCKEY: {
    label: "Hockey",
    labelHe: "הוקי",
    icon: "⌐",
    category: "TEAM",
    aliases: ["ice hockey", "field hockey", "roller hockey", "הוקי קרח", "הוקי שדה"],
  },

  BOXING: {
    label: "Boxing",
    labelHe: "אגרוף",
    icon: "✊",
    category: "COMBAT",
    aliases: ["sparring", "heavy bag", "איגרוף"],
  },
  KICKBOXING: {
    label: "Kickboxing & Muay Thai",
    labelHe: "קיקבוקס ומואי תאי",
    icon: "✕",
    category: "COMBAT",
    aliases: ["kickbox", "muay thai", "thai boxing", "k1", "קיק בוקס", "תאילנדי"],
  },
  MARTIAL_ARTS: {
    label: "Martial Arts",
    labelHe: "אומנויות לחימה",
    icon: "⚔",
    category: "COMBAT",
    aliases: ["bjj", "jiu jitsu", "judo", "karate", "taekwondo", "krav maga", "mma", "wrestling", "grappling", "aikido", "capoeira", "ג׳יו ג׳יטסו", "ג׳ודו", "קראטה", "טאקוונדו", "קרב מגע", "היאבקות"],
  },

  CLIMBING: {
    label: "Climbing",
    labelHe: "טיפוס",
    icon: "⌃",
    category: "OUTDOOR",
    aliases: ["bouldering", "boulder", "rock climbing", "climbing wall", "בולדרינג", "קיר טיפוס"],
  },
  SURFING: {
    label: "Surfing",
    labelHe: "גלישת גלים",
    icon: "∽",
    category: "OUTDOOR",
    aliases: ["surf", "bodyboard", "windsurf", "kitesurf", "wing foil", "גלישה", "גלשן", "גלישת רוח", "קייט"],
  },
  SUP: {
    label: "Stand-up Paddle",
    labelHe: "סאפ",
    icon: "⊸",
    category: "OUTDOOR",
    aliases: ["sup", "paddleboard", "paddle board", "stand up paddle", "סטנד אפ"],
  },
  KAYAKING: {
    label: "Kayaking",
    labelHe: "קיאקים",
    icon: "⌒",
    category: "OUTDOOR",
    aliases: ["kayak", "canoe", "canoeing", "קאנו", "קיאק", "שייט"],
  },
  SKATING: {
    label: "Skating",
    labelHe: "החלקה",
    icon: "⊃",
    category: "OUTDOOR",
    aliases: ["inline skating", "rollerblading", "roller skating", "ice skating", "skateboard", "רולרבליידס", "גלגיליות", "החלקה על קרח", "סקייטבורד"],
  },
  SKIING: {
    label: "Skiing",
    labelHe: "סקי",
    icon: "╱",
    category: "OUTDOOR",
    aliases: ["ski", "downhill skiing", "גלישת סקי"],
  },
  SNOWBOARDING: {
    label: "Snowboarding",
    labelHe: "סנובורד",
    icon: "▱",
    category: "OUTDOOR",
    aliases: ["snowboard"],
  },
  GOLF: {
    label: "Golf",
    labelHe: "גולף",
    icon: "⚑",
    category: "OUTDOOR",
    aliases: ["driving range"],
  },

  SPORT: {
    label: "Other Sport",
    labelHe: "ספורט אחר",
    icon: "◆",
    category: "OTHER",
    aliases: ["game", "match", "משחק", "ספורט"],
  },
  OTHER: {
    label: "Other",
    labelHe: "אחר",
    icon: "•",
    category: "OTHER",
    aliases: ["misc", "workout", "שונות", "אימון"],
  },
};

/**
 * Intensity is an OUTPUT, not a question. The app never asks how hard a session felt —
 * `rateWorkout` in ./difficulty derives the band from the activity and the logged pace,
 * and these are just the words it gets displayed with. Nothing should ever wire a user
 * control to this type.
 */
export type IntensityKey = "LOW" | "MEDIUM" | "HIGH";

export const INTENSITIES: Record<IntensityKey, { label: string; labelHe: string; hint: string; hintHe: string }> = {
  LOW: {
    label: "Easy",
    labelHe: "קל",
    hint: "Gentler than a usual session of this activity",
    hintHe: "קליל מאימון רגיל בפעילות הזו",
  },
  MEDIUM: {
    label: "Moderate",
    labelHe: "בינוני",
    hint: "About what this activity normally costs",
    hintHe: "בערך העומס הרגיל של הפעילות הזו",
  },
  HIGH: {
    label: "All-out",
    labelHe: "על מלא",
    hint: "Well above the usual pace for this activity",
    hintHe: "הרבה מעל הקצב הרגיל בפעילות הזו",
  },
};

/**
 * Most commonly logged first — the landing page shows the head of this list, and search
 * breaks ties by it. It is also the allow-list the API validates against, so every key
 * must appear exactly once.
 */
export const WORKOUT_TYPE_ORDER: WorkoutTypeKey[] = [
  "RUNNING",
  "STRENGTH",
  "CYCLING",
  "SWIMMING",
  "WALKING",
  "PILATES",
  "CROSSFIT",
  "SPINNING",
  "HIIT",
  "YOGA",
  "HIKING",
  "PADEL",
  "TENNIS",
  "SOCCER",
  "BASKETBALL",
  "HYROX",
  "POWERLIFTING",
  "ROWING",
  "ELLIPTICAL",
  "BOXING",
  "MARTIAL_ARTS",
  "KICKBOXING",
  "DANCE",
  "CLIMBING",
  "TRAIL_RUNNING",
  "MOUNTAIN_BIKING",
  "CALISTHENICS",
  "WEIGHTLIFTING",
  "STAIR_CLIMBER",
  "JUMP_ROPE",
  "AEROBICS",
  "BARRE",
  "STRETCHING",
  "SQUASH",
  "BADMINTON",
  "TABLE_TENNIS",
  "PICKLEBALL",
  "VOLLEYBALL",
  "HANDBALL",
  "RUGBY",
  "HOCKEY",
  "SURFING",
  "SUP",
  "KAYAKING",
  "SKATING",
  "SKIING",
  "SNOWBOARDING",
  "GOLF",
  "TRIATHLON",
  "SPORT",
  "OTHER",
];

/** Guards any stored string before it is used as a key — unknown or retired types read as OTHER. */
export function toWorkoutTypeKey(type: string | null | undefined): WorkoutTypeKey {
  return type && type in WORKOUT_TYPES ? (type as WorkoutTypeKey) : "OTHER";
}

/** Activity name in the viewer's language. */
export function typeLabel(key: WorkoutTypeKey, locale: "he" | "en"): string {
  const meta = WORKOUT_TYPES[key] ?? WORKOUT_TYPES.OTHER;
  return locale === "he" ? meta.labelHe : meta.label;
}

/** Derived intensity band's name in the viewer's language. */
export function intensityLabel(key: IntensityKey, locale: "he" | "en"): string {
  const meta = INTENSITIES[key] ?? INTENSITIES.MEDIUM;
  return locale === "he" ? meta.labelHe : meta.label;
}

/** What the derived band means, in the viewer's language — badge tooltips. */
export function intensityHint(key: IntensityKey, locale: "he" | "en"): string {
  const meta = INTENSITIES[key] ?? INTENSITIES.MEDIUM;
  return locale === "he" ? meta.hintHe : meta.hint;
}

/**
 * Activities where a distance is meaningful. Only the ones with a pace table in
 * ./difficulty turn that distance into METs; for the rest (trail, MTB, paddling…)
 * terrain and water swamp speed, so the distance is kept for records but the rating uses
 * the activity's typical cost. Spinning is left out on purpose: a stationary bike's
 * "distance" is a number the machine makes up.
 */
export const TYPES_WITH_DISTANCE: WorkoutTypeKey[] = [
  "RUNNING",
  "TRAIL_RUNNING",
  "WALKING",
  "HIKING",
  "CYCLING",
  "MOUNTAIN_BIKING",
  "SWIMMING",
  "ROWING",
  "TRIATHLON",
  "KAYAKING",
  "SUP",
  "SKATING",
];

export function usesDistance(key: WorkoutTypeKey): boolean {
  return TYPES_WITH_DISTANCE.includes(key);
}
