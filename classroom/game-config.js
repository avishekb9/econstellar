/* ════════════════════════════════════════════════════════════════════════════
   classroom/game-config.js — the ONLY file an instructor edits.

   The Market Maker game is a static page. It has no backend and stores nothing
   about a student anywhere except that student's own browser. The one thing it
   can do is POST a finished run into a Google Form that YOU own, which lands in
   your Form's response sheet exactly like a quiz submission.

   ── TO SWITCH SUBMISSION ON ───────────────────────────────────────────────────
   1. Create a Google Form. Add SEVEN short-answer questions, IN THIS ORDER:

        1. Student ID
        2. Display handle
        3. Score
        4. Correct out of total
        5. Best streak
        6. Weakest concepts
        7. Run detail

      (Titles don't matter, order does. Leave every one of them NOT required —
       a required question will silently reject the submission.)

   2. In the Form: ⋮ menu → "Get pre-filled link" → type any junk into all
      seven boxes → "Get link" → Copy link.

   3. Open  classroom/form-setup.html  in a browser, paste that link, and it
      prints the exact block to paste below. Nothing is sent anywhere; the page
      only parses the URL you paste.

   4. Paste, commit, done. Until then the game runs fine and simply tells
      students to copy their result into a Classroom private comment instead.

   ── THE ONE THAT WILL CATCH YOU ───────────────────────────────────────────────
   A new Google Form is NOT publicly reachable until you press "Publish" (the
   button beside Send) and set responder access to "Anyone with the link".
   Before that, both GET /viewform and POST /formResponse return HTTP 401 to
   anyone not signed in — and because the game posts cross-origin it CANNOT see
   that rejection, so students would be told it worked while nothing arrived.
   Verify with:
     curl -s -o /dev/null -w "%{http_code}" -L <the /viewform URL>
   200 = published. 401 = still restricted, whatever the Settings tab claims.
   ═══════════════════════════════════════════════════════════════════════════ */

window.MM_CONFIG = {

  /* ── submission ─────────────────────────────────────────────────────────── */
  // The Form's POST endpoint. Ends in /formResponse (NOT /viewform).
  formAction: "https://docs.google.com/forms/d/e/1FAIpQLSdgCzpC3o_7A1XIkHZ8z1VjgQynKSlBD9ig1ijb6GMDbRprdw/formResponse",

  // Field ids from the pre-filled link, e.g. "entry.1234567890".
  entries: {
    id:      "entry.1127529271",   // roll number or institute email the student typed
    handle:  "entry.736541677",    // self-chosen display name
    score:   "entry.1760178404",   // final score for the run
    correct: "entry.543283316",    // "9/12"
    streak:  "entry.1684560969",   // longest streak in the run
    weak:    "entry.1654102714",   // concepts they lost the most points on
    detail:  "entry.599661456"     // compact JSON: per-question outcomes, timings, config
  },

  /* ── entry gate ─────────────────────────────────────────────────────────── */
  // Optional shared code posted in Google Classroom. Blank = no code asked for.
  // This keeps casual passers-by out. It is NOT authentication: the page is
  // public and anyone with the code can enter. Said plainly on the page too.
  classCode: "",

  // Optional regex the student ID must match. Blank = accept anything non-empty.
  // Example for IIT Bhubaneswar: "^(\\d{2}[A-Za-z]{2}\\d{5}|[\\w.+-]+@iitbbs\\.ac\\.in)$"
  idPattern: "",

  /* ── optional: let students see class-wide numbers ──────────────────────── */
  // OFF by default — students see only their own results.
  // To turn on: in the Form's response spreadsheet, File → Share → Publish to
  // web → choose the responses sheet → Comma-separated values (.csv) → publish,
  // then paste that CSV URL here. Reads are public and read-only; writes still
  // go only through the Form. Turning this on makes scores visible to the class.
  classPulseCsv: "",

  /* ── game shape ─────────────────────────────────────────────────────────── */
  runLength: 12,          // questions per run (4 per tier when divisible by 3)
  timers: { 1: 25, 2: 35, 3: 50 },   // seconds per question, by tier
  base:   { 1: 100, 2: 200, 3: 350 } // base points, by tier
};
