#include <3ds.h>
#include <citro2d.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <time.h>

#include "names.h"
#include "pld.h"
#include "qrcodegen.h"

#ifndef APP_VERSION
#define APP_VERSION "dev"
#endif

#ifndef WRAPPED_URL
#define WRAPPED_URL "https://p0tzz.github.io/3ds-wrapped/"
#endif

#define TOP_W 400
#define BOT_W 320
#define SCR_H 240

// same palette as the website
#define C_BG     C2D_Color32(0x0a, 0x0a, 0x0c, 0xff)
#define C_BG2    C2D_Color32(0x0e, 0x14, 0x24, 0xff)
#define C_PANEL  C2D_Color32(0x14, 0x19, 0x24, 0xff)
#define C_PANEL2 C2D_Color32(0x1d, 0x24, 0x33, 0xff)
#define C_LINE   C2D_Color32(0x26, 0x2f, 0x40, 0xff)
#define C_TEXT   C2D_Color32(0xff, 0xff, 0xff, 0xff)
#define C_MUTED  C2D_Color32(0x9a, 0xa4, 0xb5, 0xff)
#define C_BLUE   C2D_Color32(0x1f, 0x8b, 0xff, 0xff)
#define C_CYAN   C2D_Color32(0x00, 0xaa, 0xff, 0xff)
#define C_WHITE  C2D_Color32(0xff, 0xff, 0xff, 0xff)
#define C_INK    C2D_Color32(0x0a, 0x0a, 0x0c, 0xff)
#define C_SOFT   C2D_Color32(0xb8, 0xd9, 0xff, 0xff)

// ---------- language: Spanish if the console is in Spanish, English otherwise ----------
static bool en;
#define TR(es, eng) (en ? (eng) : (es))

static const char *MONTHS_ES[] = {"enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"};
static const char *MONTHS_EN[] = {"January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"};

// ---------- state ----------
static u8 qr[qrcodegen_BUFFER_LEN_MAX];
static u8 qrTemp[qrcodegen_BUFFER_LEN_MAX];
static char url[1600];
static int qrScale;

static YearStats stats;
static Lifetime lifetime;
static Extras extras;
static C2D_TextBuf tbuf;

typedef struct {
    char name[128];
    char hours[16];
    float ratio;
} TopRow;
static TopRow topRows[3];
static int topCount;
static char lifeTop[128], lifeSince[48];

static bool stepsOk;
static u32 stepsTotal;
static u32 stepsYear[64];  // index: year - 2000

static float anim = 1.0f;  // 0 -> 1 after each change
static int slideDir;
static int page;           // 0: this year, 1: whole 3DS

// ---------- drawing helpers ----------
static void rrect(float x, float y, float w, float h, float r, u32 c) {
    C2D_DrawRectSolid(x + r, y, 0, w - 2 * r, h, c);
    C2D_DrawRectSolid(x, y + r, 0, r, h - 2 * r, c);
    C2D_DrawRectSolid(x + w - r, y + r, 0, r, h - 2 * r, c);
    C2D_DrawCircleSolid(x + r, y + r, 0, r, c);
    C2D_DrawCircleSolid(x + w - r, y + r, 0, r, c);
    C2D_DrawCircleSolid(x + r, y + h - r, 0, r, c);
    C2D_DrawCircleSolid(x + w - r, y + h - r, 0, r, c);
}

static float text_width(const char *s, float size) {
    C2D_Text t;
    C2D_TextParse(&t, tbuf, s);
    float w = 0;
    C2D_TextGetDimensions(&t, size, size, &w, NULL);
    return w;
}

static void text(const char *s, float x, float y, float size, u32 color, u32 align) {
    C2D_Text t;
    C2D_TextParse(&t, tbuf, s);
    C2D_TextOptimize(&t);
    C2D_DrawText(&t, C2D_WithColor | align, x, y, 0, size, size, color);
}

// shorten a UTF-8 string with "…" until it fits
static void fit(const char *src, float size, float maxw, char *out, int outlen) {
    snprintf(out, outlen, "%s", src);
    if (text_width(out, size) <= maxw) return;
    int n = strlen(out);
    char tmp[128] = "…";
    while (n > 0) {
        n--;
        while (n > 0 && ((u8)src[n] & 0xC0) == 0x80) n--;
        snprintf(tmp, sizeof(tmp), "%.*s…", n, src);
        if (text_width(tmp, size) <= maxw) break;
    }
    snprintf(out, outlen, "%s", tmp);
}

// 1234567 -> "1.234.567" (es) / "1,234,567" (en)
static void fmt_num(u32 v, char *out, int outlen) {
    char raw[16];
    snprintf(raw, sizeof(raw), "%lu", (unsigned long)v);
    int len = strlen(raw), o = 0;
    for (int i = 0; i < len && o < outlen - 1; i++) {
        if (i && (len - i) % 3 == 0 && o < outlen - 1) out[o++] = en ? ',' : '.';
        out[o++] = raw[i];
    }
    out[o] = '\0';
}

// the app icon (same drawing as img/logo.svg), size px square
static void logo(float x, float y, float s) {
    float k = s / 64.0f;
    rrect(x, y, s, s, 16 * k, C_BLUE);
    rrect(x + 13 * k, y + 9 * k, 38 * k, 23 * k, 4.5f * k, C_WHITE);
    C2D_DrawRectSolid(x + 20 * k, y + 21 * k, 0, 5.5f * k, 7 * k, C2D_Color32(0x8f, 0xc5, 0xff, 0xff));
    C2D_DrawRectSolid(x + 29.25f * k, y + 17 * k, 0, 5.5f * k, 11 * k, C2D_Color32(0x4f, 0xa6, 0xff, 0xff));
    C2D_DrawRectSolid(x + 38.5f * k, y + 13 * k, 0, 5.5f * k, 15 * k, C_BLUE);
    rrect(x + 17 * k, y + 35 * k, 30 * k, 20 * k, 4.5f * k, C2D_Color32(0xee, 0xf4, 0xff, 0xff));
    for (int i = 0; i < 6; i++) {
        u32 c = (i == 2 || i == 4) ? C_BLUE : C2D_Color32(0x8f, 0xc5, 0xff, 0xff);
        C2D_DrawRectSolid(x + (22 + (i % 3) * 7.5f) * k, y + (38.75f + (i / 3) * 7.5f) * k, 0, 5 * k, 5 * k, c);
    }
}

static void triangle(float x, float y, float s, bool left, u32 c) {
    if (left) C2D_DrawTriangle(x + s, y - s, c, x + s, y + s, c, x - s * 0.6f, y, c, 0);
    else      C2D_DrawTriangle(x - s, y - s, c, x - s, y + s, c, x + s * 0.6f, y, c, 0);
}

static void background(float w) {
    C2D_DrawRectangle(0, 0, 0, w, SCR_H, C_BG2, C_BG2, C_BG, C_BG);
}

static float ease(float t) { return 1 - (1 - t) * (1 - t) * (1 - t); }

// ---------- dates ----------
static bool is_leap(int y) { return (y % 4 == 0 && y % 100 != 0) || y % 400 == 0; }

static void days_to_ym(u32 days, int *year, int *month) {
    static const u8 ML[12] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
    int y = 2000;
    while (days >= (u32)(is_leap(y) ? 366 : 365)) { days -= is_leap(y) ? 366 : 365; y++; }
    int m = 0;
    while (m < 11 && days >= (u32)(ML[m] + (m == 1 && is_leap(y)))) { days -= ML[m] + (m == 1 && is_leap(y)); m++; }
    *year = y;
    *month = m;
}

// ---------- steps (pedometer) ----------
static u32 stepsProbe[2];  // sums of the first/last day of the history, for the diagnostics
static u32 stepsHours;

static void read_steps(void) {
    if (R_FAILED(ptmuInit())) return;
    if (R_SUCCEEDED(PTMU_GetTotalStepCount(&stepsTotal))) stepsOk = true;
    // hourly history, newest hour last; ask for as much as the system gives
    const u32 tries[] = {24 * 366 * 5, 24 * 366, 24 * 31, 24 * 7};
    for (int k = 0; k < 4; k++) {
        u32 hours = tries[k];
        u16 *hist = calloc(hours, sizeof(u16));
        if (!hist) continue;
        if (R_SUCCEEDED(PTMU_GetStepHistory(hours, hist))) {
            time_t now = time(NULL);  // console clock, local time
            for (u32 i = 0; i < hours; i++) {
                if (!hist[i]) continue;
                time_t ts = now - (time_t)(hours - 1 - i) * 3600;
                struct tm *t = gmtime(&ts);
                int y = t->tm_year + 1900 - 2000;
                if (y >= 0 && y < 64) stepsYear[y] += hist[i];
            }
            for (u32 i = 0; i < 24 && i < hours; i++) { stepsProbe[0] += hist[i]; stepsProbe[1] += hist[hours - 1 - i]; }
            stepsHours = hours;
            free(hist);
            break;
        }
        free(hist);
    }
    ptmuExit();
}

// ---------- names ----------
static void title_name(u64 tid, char *out, int outlen) {
    const char *n = names_get(tid);
    u32 lo = (u32)tid;
    if (n) snprintf(out, outlen, "%s", n);
    else if ((tid >> 32) == 0x00048004 && lo)  // DS: low word is the game code in ASCII
        snprintf(out, outlen, TR("Juego de DS (%c%c%c%c)", "DS game (%c%c%c%c)"), (char)(lo >> 24), (char)(lo >> 16), (char)(lo >> 8), (char)lo);
    else if ((tid >> 32) == 0x00048004)
        snprintf(out, outlen, "%s", TR("Juegos de DS (TWiLight)", "DS games (TWiLight)"));
    else
        snprintf(out, outlen, TR("Título %08lX", "Title %08lX"), (unsigned long)lo);
}

// ---------- QR ----------
static bool encode(NameFn fn, const Extras *ex) {
    pld_url(&stats, ex, WRAPPED_URL, fn, url, sizeof(url));
    qrScale = 0;
    if (!qrcodegen_encodeText(url, qrTemp, qr, qrcodegen_Ecc_LOW, qrcodegen_VERSION_MIN, qrcodegen_VERSION_MAX,
                              qrcodegen_Mask_AUTO, true))
        return false;
    // the card is 236 px; keep at least 3 modules of white around the code
    qrScale = 236 / (qrcodegen_getSize(qr) + 6);
    return qrScale >= 2;
}

static void draw_qr(void) {
    const float card = 236, cx = 2, cy = 2;
    rrect(cx, cy, card, card, 14, C_WHITE);
    if (!qrScale) {
        text(TR("No cabe el QR", "The QR does not fit"), cx + card / 2, cy + card / 2 - 8, 0.6f, C_INK, C2D_AlignCenter);
        return;
    }
    int size = qrcodegen_getSize(qr);
    float px = size * qrScale;
    float ox = cx + (card - px) / 2, oy = cy + (card - px) / 2;
    for (int y = 0; y < size; y++) {
        int x = 0;
        while (x < size) {
            if (!qrcodegen_getModule(qr, x, y)) { x++; continue; }
            int start = x;
            while (x < size && qrcodegen_getModule(qr, x, y)) x++;
            C2D_DrawRectSolid(ox + start * qrScale, oy + y * qrScale, 0, (x - start) * qrScale, qrScale, C_INK);
        }
    }
}

// ---------- data ----------
static void save_link(void) {
    FILE *f = fopen("sdmc:/3ds/3ds-wrapped/enlace.txt", "w");
    if (!f) return;
    fprintf(f, "%s\n", url);
    fclose(f);
}

static void build(const Chunk *chunks, int n, u16 year) {
    pld_year_stats(chunks, n, year, &stats);
    extras.stepsYear = (year >= 2000 && year < 2064) ? stepsYear[year - 2000] : 0;
    // the extras and the names make the code denser; drop them until it can be scanned
    if (!encode(names_get, &extras) && !encode(NULL, &extras) && !encode(names_get, NULL)) encode(NULL, NULL);
    save_link();

    topCount = stats.ntitles < 3 ? stats.ntitles : 3;
    u32 max = topCount ? stats.titles[0].secs : 1;
    for (int i = 0; i < topCount; i++) {
        char full[128];
        title_name(stats.titles[i].tid, full, sizeof(full));
        fit(full, 0.5f, 214, topRows[i].name, sizeof(topRows[i].name));
        snprintf(topRows[i].hours, sizeof(topRows[i].hours), "%lu h", (unsigned long)(stats.titles[i].secs / 3600));
        topRows[i].ratio = max ? (float)stats.titles[i].secs / max : 0;
    }
    C2D_TextBufClear(tbuf);
    anim = 0;
}

static void build_lifetime_texts(void) {
    char full[128];
    title_name(lifetime.topTid, full, sizeof(full));
    fit(full, 0.55f, 286, lifeTop, sizeof(lifeTop));
    if (lifetime.firstDay) {
        int y, m;
        days_to_ym(lifetime.firstDay, &y, &m);
        if (en) snprintf(lifeSince, sizeof(lifeSince), "since %s %d", MONTHS_EN[m], y);
        else snprintf(lifeSince, sizeof(lifeSince), "desde %s de %d", MONTHS_ES[m], y);
    } else {
        lifeSince[0] = '\0';
    }
    C2D_TextBufClear(tbuf);
}

// sd:/3ds/3ds-wrapped/diagnostico.txt: every title in the log and whether it has a name
static void write_diagnostics(const char *source, const Chunk *chunks, int n) {
    FILE *f = fopen("sdmc:/3ds/3ds-wrapped/diagnostico.txt", "w");
    if (!f) return;
    fprintf(f, "3DS Wrapped " APP_VERSION "\n");
    fprintf(f, "datos: %s, %d bloques de una hora\n\n", source ? source : "(ninguno)", n);

    static u64 tids[MAX_TITLES];
    static u32 secs[MAX_TITLES];
    int nt = 0;
    for (int i = 0; i < n; i++) {
        int j = 0;
        while (j < nt && tids[j] != chunks[i].tid) j++;
        if (j == nt) {
            if (nt == MAX_TITLES) continue;
            tids[nt] = chunks[i].tid;
            secs[nt++] = 0;
        }
        secs[j] += chunks[i].secs;
    }
    fprintf(f, "[titulos en el registro]\n");
    for (int j = 0; j < nt; j++) {
        const char *nm = names_get(tids[j]);
        fprintf(f, "%016llX  %7.1f h  %s%s\n", tids[j], secs[j] / 3600.0, nm ? nm : "(sin nombre)",
                pld_needs_name(tids[j]) ? "  [va en el QR]" : "");
    }
    fprintf(f, "titulos: %d\n\n", nt);

    fprintf(f, "[toda la consola]\n");
    fprintf(f, "horas: %.1f  aperturas: %lu  titulos: %u  primer dia (desde 2000): %u\n",
            lifetime.totalSecs / 3600.0, (unsigned long)lifetime.launches, lifetime.titles, lifetime.firstDay);
    for (int i = 0; i < lifetime.nyears; i++)
        fprintf(f, "  %u: %.1f h, %u dias, %u juegos\n", lifetime.years[i].year, lifetime.years[i].secs / 3600.0,
                lifetime.years[i].days, lifetime.years[i].games);
    fprintf(f, "\n[pasos]\ntotal: %lu (%s)  historial: %lu horas  primer dia: %lu  ultimo dia: %lu\n",
            (unsigned long)stepsTotal, stepsOk ? "ok" : "sin datos", (unsigned long)stepsHours,
            (unsigned long)stepsProbe[0], (unsigned long)stepsProbe[1]);
    for (int y = 0; y < 64; y++)
        if (stepsYear[y]) fprintf(f, "  %d: %lu pasos\n", 2000 + y, (unsigned long)stepsYear[y]);
    fprintf(f, "\n");
    names_dump(f);
    fclose(f);
}

// ---------- screens ----------
static void draw_top(u16 year) {
    background(TOP_W);
    draw_qr();

    const float x = 250;
    logo(x, 16, 30);
    text("3DS Wrapped", x + 38, 21, 0.62f, C_TEXT, C2D_AlignLeft);

    char buf[16];
    snprintf(buf, sizeof(buf), "%u", year);
    float a = ease(anim);
    text(TR("Tu año", "Your year"), x, 66, 0.48f, C_CYAN, C2D_AlignLeft);
    text(buf, x + slideDir * (1 - a) * 18, 80, 1.45f, C_TEXT, C2D_AlignLeft);

    C2D_DrawRectSolid(x, 134, 0, 138, 1, C_LINE);
    text(TR("Escanea el código", "Scan the code"), x, 144, 0.55f, C_TEXT, C2D_AlignLeft);
    text(TR("con la cámara de", "with your phone's"), x, 162, 0.5f, C_MUTED, C2D_AlignLeft);
    text(TR("tu móvil.", "camera."), x, 178, 0.5f, C_MUTED, C2D_AlignLeft);
    text(TR("Enlace también en la SD:", "Link also saved on the SD:"), x, 206, 0.38f, C_MUTED, C2D_AlignLeft);
    text("3ds/3ds-wrapped/enlace.txt", x, 219, 0.38f, C_SOFT, C2D_AlignLeft);
}

static void stat_tile(float x, float y, const char *value, const char *label, u32 color) {
    rrect(x, y, 148, 42, 9, C_PANEL);
    text(value, x + 11, y + 4, 0.78f, color, C2D_AlignLeft);
    text(label, x + 11, y + 26, 0.42f, C_MUTED, C2D_AlignLeft);
}

static void footer(const char *hint) {
    C2D_DrawRectSolid(0, 222, 0, BOT_W, 18, C_PANEL);
    text(hint, 10, 224, 0.38f, C_MUTED, C2D_AlignLeft);
    // page button (also reachable with X)
    rrect(BOT_W - 112, 223, 106, 16, 8, C_PANEL2);
    text(page ? TR("X  Este año", "X  This year") : TR("X  Toda tu 3DS", "X  All time"), BOT_W - 59, 224, 0.38f, C_TEXT, C2D_AlignCenter);
}

static void draw_year_page(u16 year, bool canPrev, bool canNext) {
    float a = ease(anim);

    C2D_DrawRectSolid(0, 0, 0, BOT_W, 36, C_PANEL);
    C2D_DrawRectSolid(0, 36, 0, BOT_W, 1, C_LINE);
    C2D_DrawCircleSolid(22, 18, 0, 13, canPrev ? C_PANEL2 : C_PANEL);
    C2D_DrawCircleSolid(BOT_W - 22, 18, 0, 13, canNext ? C_PANEL2 : C_PANEL);
    triangle(21, 18, 5, true, canPrev ? C_TEXT : C_LINE);
    triangle(BOT_W - 21, 18, 5, false, canNext ? C_TEXT : C_LINE);
    char buf[48];
    snprintf(buf, sizeof(buf), TR("Resumen de %u", "%u in review"), year);
    text(buf, BOT_W / 2 + slideDir * (1 - a) * 16, 9, 0.6f, C_TEXT, C2D_AlignCenter);

    char v[32];
    snprintf(v, sizeof(v), "%lu h", (unsigned long)(stats.totalSecs / 3600 * a));
    stat_tile(8, 44, v, TR("jugadas en total", "played in total"), C_CYAN);
    snprintf(v, sizeof(v), "%d", (int)(stats.ntitles * a + 0.5f));
    stat_tile(164, 44, v, TR("juegos", "games"), C_TEXT);
    snprintf(v, sizeof(v), "%d", (int)(stats.daysPlayed * a + 0.5f));
    stat_tile(8, 90, v, TR("días jugando", "days played"), C_TEXT);
    snprintf(v, sizeof(v), "%d", (int)(stats.streakLen * a + 0.5f));
    stat_tile(164, 90, v, TR(stats.streakLen == 1 ? "día de racha" : "días de racha", "day streak"), C_TEXT);

    text(TR("Más jugados", "Most played"), 10, 138, 0.45f, C_MUTED, C2D_AlignLeft);
    for (int i = 0; i < topCount; i++) {
        float y = 156 + i * 21;
        C2D_DrawCircleSolid(17, y + 7, 0, 8, i == 0 ? C_BLUE : C_PANEL2);
        snprintf(buf, sizeof(buf), "%d", i + 1);
        text(buf, 17, y, 0.42f, C_TEXT, C2D_AlignCenter);
        text(topRows[i].name, 31, y - 1, 0.5f, C_TEXT, C2D_AlignLeft);
        text(topRows[i].hours, BOT_W - 10, y - 1, 0.5f, C_CYAN, C2D_AlignRight);
        C2D_DrawRectSolid(31, y + 16, 0, BOT_W - 41, 2, C_LINE);
        C2D_DrawRectSolid(31, y + 16, 0, (BOT_W - 41) * topRows[i].ratio * a, 2, i == 0 ? C_CYAN : C_BLUE);
    }
    if (!topCount) text(TR("No hay partidas este año.", "No play sessions this year."), BOT_W / 2, 170, 0.5f, C_MUTED, C2D_AlignCenter);

    footer(TR("L/R: año  ·  START: salir", "L/R: year  ·  START: quit"));
}

static void draw_life_page(void) {
    float a = ease(anim);
    C2D_DrawRectSolid(0, 0, 0, BOT_W, 36, C_PANEL);
    C2D_DrawRectSolid(0, 36, 0, BOT_W, 1, C_LINE);
    text(TR("Toda tu 3DS", "Your whole 3DS"), BOT_W / 2, 3, 0.6f, C_TEXT, C2D_AlignCenter);
    text(lifeSince, BOT_W / 2, 21, 0.4f, C_CYAN, C2D_AlignCenter);

    char v[32], n[24];
    fmt_num((u32)(lifetime.totalSecs / 3600 * a), n, sizeof(n));
    snprintf(v, sizeof(v), "%s h", n);
    stat_tile(8, 44, v, TR("jugadas desde siempre", "played, all time"), C_CYAN);
    fmt_num((u32)(lifetime.titles * a + 0.5f), n, sizeof(n));
    stat_tile(164, 44, n, TR("títulos", "titles"), C_TEXT);
    fmt_num((u32)(lifetime.launches * a + 0.5f), v, sizeof(v));
    stat_tile(8, 90, v, TR("veces que abriste algo", "times you opened something"), C_TEXT);
    if (stepsOk) {
        fmt_num((u32)(stepsTotal * a), v, sizeof(v));
        stat_tile(164, 90, v, TR("pasos con la consola", "steps with the console"), C_TEXT);
    } else {
        stat_tile(164, 90, "—", TR("pasos", "steps"), C_MUTED);
    }

    rrect(8, 138, BOT_W - 16, 78, 10, C_PANEL);
    text(TR("Tu juego de siempre", "Your all-time favourite"), 18, 144, 0.42f, C_CYAN, C2D_AlignLeft);
    text(lifeTop, 18, 162, 0.55f, C_TEXT, C2D_AlignLeft);
    fmt_num(lifetime.topSecs / 3600, n, sizeof(n));
    if (lifetime.topLaunches)
        snprintf(v, sizeof(v), TR("%s h · abierto %u veces", "%s h · opened %u times"), n, lifetime.topLaunches);
    else
        snprintf(v, sizeof(v), "%s h", n);
    text(v, 18, 186, 0.48f, C_MUTED, C2D_AlignLeft);

    footer(TR("START: salir", "START: quit"));
}

static void draw_message(C3D_RenderTarget *top, C3D_RenderTarget *bot, const char *title, const char *l1, const char *l2, const char *l3) {
    C3D_FrameBegin(C3D_FRAME_SYNCDRAW);
    C2D_TextBufClear(tbuf);
    C2D_TargetClear(top, C_BG);
    C2D_SceneBegin(top);
    background(TOP_W);
    logo(TOP_W / 2 - 32, 54, 64);
    text("3DS Wrapped", TOP_W / 2, 132, 0.9f, C_TEXT, C2D_AlignCenter);
    text(TR("Tu año en la consola", "Your year on the console"), TOP_W / 2, 162, 0.5f, C_CYAN, C2D_AlignCenter);
    text("v" APP_VERSION, TOP_W / 2, 214, 0.38f, C_MUTED, C2D_AlignCenter);

    C2D_TargetClear(bot, C_BG);
    C2D_SceneBegin(bot);
    background(BOT_W);
    rrect(14, 52, BOT_W - 28, 136, 12, C_PANEL);
    text(title, BOT_W / 2, 70, 0.62f, C_TEXT, C2D_AlignCenter);
    if (l1) text(l1, BOT_W / 2, 104, 0.46f, C_MUTED, C2D_AlignCenter);
    if (l2) text(l2, BOT_W / 2, 124, 0.46f, C_MUTED, C2D_AlignCenter);
    if (l3) text(l3, BOT_W / 2, 150, 0.46f, C_SOFT, C2D_AlignCenter);
    C3D_FrameEnd(0);
}

int main(void) {
    gfxInitDefault();
    C3D_Init(C3D_DEFAULT_CMDBUF_SIZE);
    C2D_Init(C2D_DEFAULT_MAX_OBJECTS * 4);
    C2D_Prepare();
    C3D_RenderTarget *top = C2D_CreateScreenTarget(GFX_TOP, GFX_LEFT);
    C3D_RenderTarget *bot = C2D_CreateScreenTarget(GFX_BOTTOM, GFX_LEFT);
    tbuf = C2D_TextBufNew(4096);

    if (R_SUCCEEDED(cfguInit())) {
        u8 lang = CFG_LANGUAGE_ES;
        CFGU_GetSystemLanguage(&lang);
        en = lang != CFG_LANGUAGE_ES;
        cfguExit();
    }

    draw_message(top, bot, TR("Leyendo tu registro…", "Reading your activity log…"), TR("Un momento.", "One moment."), NULL, NULL);

    mkdir("sdmc:/3ds", 0777);
    mkdir("sdmc:/3ds/3ds-wrapped", 0777);

    const char *source = NULL;
    u8 *buf = pld_load(&source);
    bool loaded = buf != NULL;
    Chunk *chunks = NULL;
    int n = 0, nyears = 0, sel = 0;
    u16 years[64];

    names_init();
    read_steps();
    if (loaded) {
        n = pld_chunks(buf, &chunks);
        nyears = pld_years(chunks, n, years, 64);
        pld_lifetime(buf, chunks, n, &lifetime);
        free(buf);
    }
    extras.lt = &lifetime;
    extras.hasSteps = stepsOk;
    extras.stepsTotal = stepsTotal;
    write_diagnostics(source, chunks, n);

    if (nyears) {
        build_lifetime_texts();
        // latest year, unless it has barely started
        sel = nyears - 1;
        build(chunks, n, years[sel]);
        if (sel > 0 && stats.daysPlayed < 7) build(chunks, n, years[--sel]);
    }

    while (aptMainLoop()) {
        hidScanInput();
        u32 down = hidKeysDown();
        if (down & KEY_START) break;

        if (nyears) {
            int prev = sel;
            bool flip = down & KEY_X;
            if (page == 0) {
                if ((down & (KEY_LEFT | KEY_L)) && sel > 0) sel--;
                if ((down & (KEY_RIGHT | KEY_R)) && sel < nyears - 1) sel++;
            }
            if (down & KEY_TOUCH) {
                touchPosition t;
                hidTouchRead(&t);
                if (page == 0 && t.py < 40 && t.px < 50 && sel > 0) sel--;
                if (page == 0 && t.py < 40 && t.px > BOT_W - 50 && sel < nyears - 1) sel++;
                if (t.py > 218 && t.px > BOT_W - 116) flip = true;
            }
            if (flip) {
                page = !page;
                anim = 0;
                slideDir = page ? 1 : -1;
            }
            if (sel != prev) {
                slideDir = sel > prev ? 1 : -1;
                build(chunks, n, years[sel]);
            }
            if (anim < 1) anim += (1.0f - anim) * 0.12f + 0.004f;
            if (anim > 1) anim = 1;

            C3D_FrameBegin(C3D_FRAME_SYNCDRAW);
            C2D_TextBufClear(tbuf);
            C2D_TargetClear(top, C_BG);
            C2D_SceneBegin(top);
            draw_top(years[sel]);
            C2D_TargetClear(bot, C_BG);
            C2D_SceneBegin(bot);
            background(BOT_W);
            if (page) draw_life_page();
            else draw_year_page(years[sel], sel > 0, sel < nyears - 1);
            C3D_FrameEnd(0);
        } else if (!loaded) {
            draw_message(top, bot, TR("No se pudo leer el registro", "Could not read the activity log"),
                         TR("Abre una vez el Registro de actividad", "Open the Activity Log once"),
                         TR("y vuelve a intentarlo.", "and try again."),
                         TR("o copia tu pld.dat a sd:/3ds/3ds-wrapped/", "or copy your pld.dat to sd:/3ds/3ds-wrapped/"));
        } else {
            draw_message(top, bot, TR("Todavía no hay partidas", "No play sessions yet"),
                         TR("El Registro de actividad está vacío.", "The Activity Log is empty."),
                         TR("Juega un poco y vuelve.", "Play a bit and come back."), TR("START: salir", "START: quit"));
        }
    }

    free(chunks);
    names_exit();
    C2D_TextBufDelete(tbuf);
    C2D_Fini();
    C3D_Fini();
    gfxExit();
    return 0;
}
