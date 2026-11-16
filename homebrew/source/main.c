#include <3ds.h>
#include <citro2d.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
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
static TopRow topRows[5];
static int topCount;

// slideshow before the QR
enum { S_INTRO, S_HOURS, S_GOTY, S_TOP5, S_PROFILE, S_STREAK, S_LIFE, S_QR, S_COUNT };
static int slide = S_INTRO;
static float slideAnim = 1.0f;
static int slideDir2 = 1;
static float clockT;  // seconds since start, for idle motion
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

// ---------- game icons (the console's own HOME Menu icons) ----------
typedef struct {
    u64 tid;
    bool ok;
    C3D_Tex tex;
    C2D_Image img;
} Icon;
static Icon icons[12];
static int nicons;
static const Tex3DS_SubTexture ICON_SUB = {48, 48, 0.0f, 48 / 64.0f, 48 / 64.0f, 0.0f};

static void icons_free(void) {
    for (int i = 0; i < nicons; i++) if (icons[i].ok) C3D_TexDelete(&icons[i].tex);
    nicons = 0;
}

static void icon_load(u64 tid) {
    for (int i = 0; i < nicons; i++) if (icons[i].tid == tid) return;
    if (nicons >= 12 || !tid) return;
    Icon *ic = &icons[nicons++];
    memset(ic, 0, sizeof(*ic));
    ic->tid = tid;
    static u16 raw[48 * 48];
    if (!names_icon(tid, raw)) return;
    if (!C3D_TexInit(&ic->tex, 64, 64, GPU_RGB565)) return;
    memset(ic->tex.data, 0, ic->tex.size);
    // the icon is already in the GPU's 8x8 tile order: copy it row of tiles by row of tiles
    u16 *dst = (u16 *)ic->tex.data + (64 - 48) * 64;
    const u16 *src = raw;
    for (int row = 0; row < 48; row += 8) {
        memcpy(dst, src, 48 * 8 * sizeof(u16));
        src += 48 * 8;
        dst += 64 * 8;
    }
    C3D_TexFlush(&ic->tex);
    ic->img = (C2D_Image){&ic->tex, &ICON_SUB};
    ic->ok = true;
}

static const C2D_Image *icon_get(u64 tid) {
    for (int i = 0; i < nicons; i++) if (icons[i].tid == tid) return icons[i].ok ? &icons[i].img : NULL;
    return NULL;
}

// icon in a rounded tile; initials if the console has no icon (DS games)
static void draw_icon(u64 tid, const char *name, float x, float y, float size) {
    rrect(x - 3, y - 3, size + 6, size + 6, size * 0.16f + 3, C_PANEL2);
    const C2D_Image *img = icon_get(tid);
    if (img) {
        C2D_DrawImageAt(*img, x, y, 0, NULL, size / 48.0f, size / 48.0f);
        return;
    }
    rrect(x, y, size, size, size * 0.16f, C2D_Color32(0x1a, 0x27, 0x42, 0xff));
    char ini[8] = {0};
    int k = 0;
    for (const char *p = name; *p && k < 2; p++) {
        if ((p == name || p[-1] == ' ') && ((*p >= 'A' && *p <= 'Z') || (*p >= 'a' && *p <= 'z') || (*p >= '0' && *p <= '9')))
            ini[k++] = (*p >= 'a' && *p <= 'z') ? *p - 32 : *p;
    }
    text(ini[0] ? ini : "?", x + size / 2, y + size / 2 - size * 0.22f, size / 60.0f, C_TEXT, C2D_AlignCenter);
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

    topCount = stats.ntitles < 5 ? stats.ntitles : 5;
    u32 max = topCount ? stats.titles[0].secs : 1;
    for (int i = 0; i < topCount; i++) {
        char full[128];
        title_name(stats.titles[i].tid, full, sizeof(full));
        fit(full, 0.5f, 214, topRows[i].name, sizeof(topRows[i].name));
        snprintf(topRows[i].hours, sizeof(topRows[i].hours), "%lu h", (unsigned long)(stats.titles[i].secs / 3600));
        topRows[i].ratio = max ? (float)stats.titles[i].secs / max : 0;
    }

    // icons for the slides (outside of a frame)
    icons_free();
    for (int i = 0; i < topCount; i++) icon_load(stats.titles[i].tid);
    icon_load(stats.longestTid);
    icon_load(lifetime.topTid);

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
    for (int i = 0; i < topCount && i < 3; i++) {
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

    footer(TR("L/R: año  ·  B: resumen", "L/R: year  ·  B: summary"));
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

    footer(TR("B: resumen  ·  START: salir", "B: summary  ·  START: quit"));
}

// ---------- slideshow ----------
static u32 fade(u32 c, float a) {
    u32 alpha = (u32)(((c >> 24) & 0xFF) * (a < 0 ? 0 : a > 1 ? 1 : a));
    return (c & 0x00FFFFFF) | (alpha << 24);
}

static int peak_hour(void) {
    int p = 0;
    for (int h = 1; h < 24; h++) if (stats.hourSecs[h] > stats.hourSecs[p]) p = h;
    return p;
}

static const char *profile_name(int peak) {
    if (peak < 6) return TR("Búho nocturno", "Night owl");
    if (peak < 12) return TR("Madrugador", "Early bird");
    if (peak < 18) return TR("Jugador de sobremesa", "Afternoon player");
    return TR("Gamer de prime time", "Prime-time gamer");
}

static const char *profile_desc(int peak) {
    if (peak < 6) return TR("Tus mejores partidas son de madrugada.", "Your best sessions happen after midnight.");
    if (peak < 12) return TR("Empiezas el día con la consola en la mano.", "You start the day with the console in your hands.");
    if (peak < 18) return TR("La tarde es tu momento.", "Afternoons are your time.");
    return TR("Las noches son para jugar.", "Evenings are for playing.");
}

// day of the year -> "23 de noviembre" / "November 23"
static void doy_text(u16 year, u16 doy, char *out, int outlen) {
    static const u8 ML[12] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
    int m = 0, d = doy;
    while (m < 11 && d >= ML[m] + (m == 1 && is_leap(year))) { d -= ML[m] + (m == 1 && is_leap(year)); m++; }
    if (en) snprintf(out, outlen, "%s %d", MONTHS_EN[m], d + 1);
    else snprintf(out, outlen, "%d de %s", d + 1, MONTHS_ES[m]);
}

static void duration_text(u32 secs, char *out, int outlen) {
    u32 m = secs / 60;
    if (m >= 60) snprintf(out, outlen, "%lu h %lu min", (unsigned long)(m / 60), (unsigned long)(m % 60));
    else snprintf(out, outlen, "%lu min", (unsigned long)m);
}

static bool has_life(void) { return lifetime.totalSecs > 0; }

// slow floating sparkles behind the slides
static void sparkles(float w) {
    for (int i = 0; i < 26; i++) {
        float sp = 6 + (i % 4) * 4;
        float x = fmodf(i * 97.0f + clockT * sp * (i % 2 ? 1 : -1) + 1000 * w, w);
        float y = fmodf(i * 53.0f + 1000 - clockT * (sp + 4), SCR_H);
        float a = 0.25f + 0.25f * sinf(clockT * 2 + i);
        C2D_DrawCircleSolid(x < 0 ? x + w : x, y < 0 ? y + SCR_H : y, 0, 1 + (i % 3) * 0.6f, fade(C_SOFT, a));
    }
}

static void slide_dots(void) {
    int count = has_life() ? S_COUNT : S_COUNT - 1;
    float w = count * 12, x0 = BOT_W / 2 - w / 2 + 6;
    for (int i = 0, k = 0; i < S_COUNT; i++) {
        if (i == S_LIFE && !has_life()) continue;
        bool on = i == slide;
        C2D_DrawCircleSolid(x0 + k * 12, 206, 0, on ? 4 : 2.5f, on ? C_CYAN : C_LINE);
        k++;
    }
    C2D_DrawRectSolid(0, 222, 0, BOT_W, 18, C_PANEL);
    text(TR("A: siguiente   B: atrás   SELECT: QR", "A: next   B: back   SELECT: QR"), BOT_W / 2, 224, 0.38f, C_MUTED, C2D_AlignCenter);
}

static void big_number(const char *s, float x, float y, float size, u32 color) {
    // soft glow under the number
    text(s, x, y + 2, size, fade(C_BLUE, 0.35f), C2D_AlignCenter);
    text(s, x, y, size, color, C2D_AlignCenter);
}

static void slide_top(u16 year) {
    float a = ease(slideAnim), dx = slideDir2 * (1 - a) * 40;
    char b1[64], b2[96];
    background(TOP_W);
    sparkles(TOP_W);
    logo(10, 8, 20);
    snprintf(b1, sizeof(b1), "3DS Wrapped · %u", year);
    text(b1, 36, 9, 0.42f, C_MUTED, C2D_AlignLeft);

    const float cx = TOP_W / 2 + dx;
    switch (slide) {
    case S_INTRO:
        logo(cx - 36, 40, 72);
        text(TR("Tu año en la consola", "Your year on the console"), cx, 124, 0.55f, fade(C_CYAN, a), C2D_AlignCenter);
        snprintf(b1, sizeof(b1), "%u", year);
        big_number(b1, cx, 142, 1.9f, fade(C_TEXT, a));
        break;
    case S_HOURS:
        text(TR("Este año jugaste", "This year you played"), cx, 38, 0.55f, fade(C_CYAN, a), C2D_AlignCenter);
        fmt_num((u32)(stats.totalSecs / 3600 * a), b1, sizeof(b1));
        big_number(b1, cx, 62, 2.5f, fade(C_TEXT, a));
        text(TR("horas", "hours"), cx, 140, 0.7f, fade(C_TEXT, a), C2D_AlignCenter);
        snprintf(b2, sizeof(b2), TR("en %u días · %u partidas", "over %u days · %u sessions"), stats.daysPlayed, stats.sessions);
        text(b2, cx, 178, 0.5f, fade(C_MUTED, a), C2D_AlignCenter);
        break;
    case S_GOTY: {
        if (!topCount) break;
        text(TR("Tu juego del año", "Your game of the year"), cx, 16, 0.55f, fade(C_CYAN, a), C2D_AlignCenter);
        float bob = sinf(clockT * 2) * 3;
        for (int r = 3; r >= 1; r--) C2D_DrawCircleSolid(cx, 92 + bob, 0, 44 + r * 10, fade(C_BLUE, 0.08f * a));
        draw_icon(stats.titles[0].tid, topRows[0].name, cx - 48, 44 + bob, 96);
        char full[128];
        title_name(stats.titles[0].tid, full, sizeof(full));
        fit(full, 0.7f, 380, b2, sizeof(b2));
        text(b2, cx, 152, 0.7f, fade(C_TEXT, a), C2D_AlignCenter);
        snprintf(b1, sizeof(b1), TR("%lu h · %d %% de tu tiempo", "%lu h · %d %% of your time"), (unsigned long)(stats.titles[0].secs / 3600),
                 (int)(stats.totalSecs ? stats.titles[0].secs * 100.0 / stats.totalSecs + 0.5 : 0));
        text(b1, cx, 184, 0.55f, fade(C_CYAN, a), C2D_AlignCenter);
        break;
    }
    case S_TOP5:
        text(TR("Tu top 5", "Your top 5"), cx, 8, 0.55f, fade(C_CYAN, a), C2D_AlignCenter);
        for (int i = 0; i < topCount; i++) {
            float y = 34 + i * 41, x = 16 + dx * (1 + i * 0.3f);
            C2D_DrawCircleSolid(x + 8, y + 16, 0, 9, i == 0 ? C_BLUE : C_PANEL2);
            snprintf(b1, sizeof(b1), "%d", i + 1);
            text(b1, x + 8, y + 8, 0.45f, C_TEXT, C2D_AlignCenter);
            draw_icon(stats.titles[i].tid, topRows[i].name, x + 26, y, 32);
            text(topRows[i].name, x + 68, y + 1, 0.52f, fade(C_TEXT, a), C2D_AlignLeft);
            text(topRows[i].hours, TOP_W - 16 + dx, y + 1, 0.52f, fade(C_CYAN, a), C2D_AlignRight);
            C2D_DrawRectSolid(x + 68, y + 22, 0, TOP_W - 100 - x, 3, C_LINE);
            C2D_DrawRectSolid(x + 68, y + 22, 0, (TOP_W - 100 - x) * topRows[i].ratio * a, 3, i == 0 ? C_CYAN : C_BLUE);
        }
        break;
    case S_PROFILE: {
        int p = peak_hour();
        text(TR("Tu perfil", "Your profile"), cx, 34, 0.55f, fade(C_CYAN, a), C2D_AlignCenter);
        fit(profile_name(p), 1.0f, 380, b2, sizeof(b2));
        big_number(b2, cx, 66, 1.0f, fade(C_TEXT, a));
        text(profile_desc(p), cx, 114, 0.5f, fade(C_MUTED, a), C2D_AlignCenter);
        snprintf(b1, sizeof(b1), TR("Tu hora punta: %d:00", "Your peak hour: %d:00"), p);
        rrect(cx - 90, 150, 180, 30, 15, C_PANEL2);
        text(b1, cx, 156, 0.52f, fade(C_CYAN, a), C2D_AlignCenter);
        break;
    }
    case S_STREAK:
        text(TR("Tu racha más larga", "Your longest streak"), cx, 30, 0.55f, fade(C_CYAN, a), C2D_AlignCenter);
        snprintf(b1, sizeof(b1), "%d", (int)(stats.streakLen * a + 0.5f));
        big_number(b1, cx, 54, 2.4f, fade(C_TEXT, a));
        text(TR(stats.streakLen == 1 ? "día seguido" : "días seguidos", stats.streakLen == 1 ? "day in a row" : "days in a row"), cx, 132, 0.65f, fade(C_TEXT, a), C2D_AlignCenter);
        if (stats.streakLen) {
            char f1[40], f2[40];
            doy_text(year, stats.streakFrom, f1, sizeof(f1));
            doy_text(year, stats.streakFrom + stats.streakLen - 1, f2, sizeof(f2));
            snprintf(b2, sizeof(b2), TR("del %s al %s", "from %s to %s"), f1, f2);
            text(b2, cx, 166, 0.48f, fade(C_MUTED, a), C2D_AlignCenter);
        }
        break;
    case S_LIFE: {
        text(TR("Toda tu 3DS", "Your whole 3DS"), cx, 20, 0.55f, fade(C_CYAN, a), C2D_AlignCenter);
        fmt_num((u32)(lifetime.totalSecs / 3600 * a), b1, sizeof(b1));
        big_number(b1, cx, 40, 2.1f, fade(C_TEXT, a));
        text(TR("horas desde siempre", "hours, all time"), cx, 110, 0.6f, fade(C_TEXT, a), C2D_AlignCenter);
        text(lifeSince, cx, 132, 0.48f, fade(C_CYAN, a), C2D_AlignCenter);
        rrect(cx - 170, 160, 340, 58, 12, C_PANEL);
        draw_icon(lifetime.topTid, lifeTop, cx - 160, 166, 46);
        text(TR("Tu juego de siempre", "Your all-time favourite"), cx - 104, 166, 0.42f, C_CYAN, C2D_AlignLeft);
        fit(lifeTop, 0.52f, 260, b2, sizeof(b2));
        text(b2, cx - 104, 184, 0.52f, C_TEXT, C2D_AlignLeft);
        break;
    }
    }
}

static void slide_bottom(u16 year) {
    float a = ease(slideAnim);
    char b1[64], b2[96];
    background(BOT_W);
    switch (slide) {
    case S_INTRO:
        rrect(16, 40, BOT_W - 32, 120, 14, C_PANEL);
        snprintf(b1, sizeof(b1), TR("Tu Wrapped de %u", "Your %u Wrapped"), year);
        text(b1, BOT_W / 2, 62, 0.7f, C_TEXT, C2D_AlignCenter);
        text(TR("está listo.", "is ready."), BOT_W / 2, 88, 0.55f, C_MUTED, C2D_AlignCenter);
        text(TR("Pulsa A para empezar", "Press A to start"), BOT_W / 2, 124, 0.55f, fade(C_CYAN, 0.6f + 0.4f * sinf(clockT * 4)), C2D_AlignCenter);
        break;
    case S_HOURS: {
        int best = 0;
        for (int m = 1; m < 12; m++) if (stats.monthSecs[m] > stats.monthSecs[best]) best = m;
        snprintf(b1, sizeof(b1), TR("Tu mes: %s · %lu h", "Your month: %s · %lu h"), en ? MONTHS_EN[best] : MONTHS_ES[best], (unsigned long)(stats.monthSecs[best] / 3600));
        text(b1, BOT_W / 2, 10, 0.5f, C_TEXT, C2D_AlignCenter);
        u32 max = stats.monthSecs[best] ? stats.monthSecs[best] : 1;
        const char *L = en ? "JFMAMJJASOND" : "EFMAMJJASOND";
        for (int m = 0; m < 12; m++) {
            float h = 130.0f * stats.monthSecs[m] / max * a, x = 18 + m * 24.5f;
            rrect(x, 172 - (h < 6 ? 6 : h), 18, h < 6 ? 6 : h, 4, m == best ? C_CYAN : C2D_Color32(0x2a, 0x3a, 0x55, 0xff));
            char l[2] = {L[m], 0};
            text(l, x + 9, 176, 0.42f, m == best ? C_TEXT : C_MUTED, C2D_AlignCenter);
        }
        break;
    }
    case S_GOTY: {
        if (!topCount) break;
        const TitleStat *t = &stats.titles[0];
        snprintf(b1, sizeof(b1), "%u", t->sessions);
        stat_tile(8, 30, b1, TR("partidas", "sessions"), C_CYAN);
        snprintf(b1, sizeof(b1), "%lu h", (unsigned long)(t->secs / 3600));
        stat_tile(164, 30, b1, TR("jugadas", "played"), C_TEXT);
        doy_text(year, t->lastDoy, b2, sizeof(b2));
        rrect(8, 80, BOT_W - 16, 44, 9, C_PANEL);
        text(TR("La última vez", "Last played"), 19, 84, 0.42f, C_MUTED, C2D_AlignLeft);
        text(b2, 19, 100, 0.55f, C_TEXT, C2D_AlignLeft);
        break;
    }
    case S_TOP5:
        snprintf(b1, sizeof(b1), "%d", (int)(stats.ntitles * a + 0.5f));
        big_number(b1, BOT_W / 2, 40, 1.8f, C_TEXT);
        text(TR("juegos distintos este año", "different games this year"), BOT_W / 2, 104, 0.55f, C_MUTED, C2D_AlignCenter);
        break;
    case S_PROFILE: {
        u32 max = 1;
        for (int h = 0; h < 24; h++) if (stats.hourSecs[h] > max) max = stats.hourSecs[h];
        int p = peak_hour();
        text(TR("Cuándo juegas", "When you play"), BOT_W / 2, 10, 0.5f, C_TEXT, C2D_AlignCenter);
        for (int h = 0; h < 24; h++) {
            float bh = 130.0f * stats.hourSecs[h] / max * a, x = 14 + h * 12.2f;
            rrect(x, 172 - (bh < 4 ? 4 : bh), 9, bh < 4 ? 4 : bh, 3, h == p ? C_CYAN : C2D_Color32(0x2a, 0x3a, 0x55, 0xff));
        }
        const char *lab[] = {"0", "6", "12", "18"};
        for (int i = 0; i < 4; i++) text(lab[i], 18 + i * 6 * 12.2f, 176, 0.4f, C_MUTED, C2D_AlignCenter);
        break;
    }
    case S_STREAK:
        rrect(8, 30, BOT_W - 16, 52, 10, C_PANEL);
        text(TR("Día con más juego", "Biggest day"), 18, 35, 0.42f, C_MUTED, C2D_AlignLeft);
        doy_text(year, stats.bestDoy, b1, sizeof(b1));
        duration_text(stats.bestSecs, b2, sizeof(b2));
        text(b1, 18, 53, 0.55f, C_TEXT, C2D_AlignLeft);
        text(b2, BOT_W - 18, 53, 0.55f, C_CYAN, C2D_AlignRight);
        rrect(8, 90, BOT_W - 16, 64, 10, C_PANEL);
        text(TR("Partida más larga", "Longest session"), 70, 95, 0.42f, C_MUTED, C2D_AlignLeft);
        if (stats.hasSessions) {
            char full[128];
            title_name(stats.longestTid, full, sizeof(full));
            fit(full, 0.5f, 230, b2, sizeof(b2));
            draw_icon(stats.longestTid, b2, 18, 100, 42);
            text(b2, 70, 112, 0.5f, C_TEXT, C2D_AlignLeft);
            duration_text(stats.longestSecs, b1, sizeof(b1));
            text(b1, 70, 130, 0.5f, C_CYAN, C2D_AlignLeft);
        }
        break;
    case S_LIFE: {
        char n[24];
        fmt_num(lifetime.titles, n, sizeof(n));
        stat_tile(8, 30, n, TR("títulos", "titles"), C_TEXT);
        fmt_num(lifetime.launches, n, sizeof(n));
        stat_tile(164, 30, n, TR("veces que abriste algo", "times you opened something"), C_TEXT);
        if (stepsOk) {
            fmt_num((u32)(stepsTotal * a), n, sizeof(n));
            rrect(8, 80, BOT_W - 16, 60, 10, C_PANEL);
            text(n, 20, 84, 0.95f, C_CYAN, C2D_AlignLeft);
            fmt_num(stepsTotal * 3 / 4000, b1, sizeof(b1));
            snprintf(b2, sizeof(b2), TR("pasos con la consola · ≈ %s km", "steps with the console · ≈ %s km"), b1);
            text(b2, 20, 118, 0.42f, C_MUTED, C2D_AlignLeft);
        }
        break;
    }
    }
    slide_dots();
}

static void go_slide(int dir) {
    int s = slide + dir;
    if (s == S_LIFE && !has_life()) s += dir;
    if (s < 0 || s >= S_COUNT) return;
    slide = s;
    slideDir2 = dir;
    slideAnim = 0;
    anim = 0;
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
            clockT += 1.0f / 60.0f;
            // L/R change the year everywhere
            if ((down & KEY_L) && sel > 0) sel--;
            if ((down & KEY_R) && sel < nyears - 1) sel++;

            if (slide < S_QR) {
                // slideshow: A / tap = next, B = back, SELECT = straight to the QR
                if (down & (KEY_A | KEY_TOUCH)) go_slide(1);
                else if (down & KEY_B) go_slide(-1);
                if (down & KEY_SELECT) { slide = S_QR; slideDir2 = 1; anim = 0; }
            } else {
                bool flip = down & KEY_X;
                if (down & KEY_B) go_slide(-1);
                if (page == 0) {
                    if ((down & KEY_LEFT) && sel > 0) sel--;
                    if ((down & KEY_RIGHT) && sel < nyears - 1) sel++;
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
            }
            if (sel != prev) {
                slideDir = slideDir2 = sel > prev ? 1 : -1;
                build(chunks, n, years[sel]);
                slideAnim = 0;
            }
            if (anim < 1) anim += (1.0f - anim) * 0.12f + 0.004f;
            if (anim > 1) anim = 1;
            if (slideAnim < 1) slideAnim += (1.0f - slideAnim) * 0.1f + 0.004f;
            if (slideAnim > 1) slideAnim = 1;

            C3D_FrameBegin(C3D_FRAME_SYNCDRAW);
            C2D_TextBufClear(tbuf);
            C2D_TargetClear(top, C_BG);
            C2D_SceneBegin(top);
            if (slide < S_QR) slide_top(years[sel]);
            else draw_top(years[sel]);
            C2D_TargetClear(bot, C_BG);
            C2D_SceneBegin(bot);
            background(BOT_W);
            if (slide < S_QR) slide_bottom(years[sel]);
            else if (page) draw_life_page();
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
    icons_free();
    names_exit();
    C2D_TextBufDelete(tbuf);
    C2D_Fini();
    C3D_Fini();
    gfxExit();
    return 0;
}
