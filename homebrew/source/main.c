#include <3ds.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>

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
#define TOP_H 240

static u8 qr[qrcodegen_BUFFER_LEN_MAX];
static u8 qrTemp[qrcodegen_BUFFER_LEN_MAX];
static char url[1600];
static int qrScale;

static YearStats stats;

static void draw_qr(void) {
    u8 *fb = gfxGetFramebuffer(GFX_TOP, GFX_LEFT, NULL, NULL);
    memset(fb, 0x18, TOP_W * TOP_H * 3);
    if (!qrScale) return;

    int size = qrcodegen_getSize(qr);
    int border = 4 * qrScale;
    int full = size * qrScale + border * 2;
    int x0 = (TOP_W - full) / 2, y0 = (TOP_H - full) / 2;

    for (int y = 0; y < full; y++) {
        for (int x = 0; x < full; x++) {
            int mx = (x - border) / qrScale, my = (y - border) / qrScale;
            bool dark = x >= border && y >= border && mx < size && my < size && qrcodegen_getModule(qr, mx, my);
            u8 c = dark ? 0x00 : 0xFF;
            // framebuffer is rotated: columns of 240 pixels, bottom to top
            u8 *px = fb + ((x0 + x) * TOP_H + (TOP_H - 1 - (y0 + y))) * 3;
            px[0] = px[1] = px[2] = c;
        }
    }
}

// also leave the link on the SD card, for phones that can't scan the screen
static void save_link(void) {
    mkdir("sdmc:/3ds", 0777);
    mkdir("sdmc:/3ds/3ds-wrapped", 0777);
    FILE *f = fopen("sdmc:/3ds/3ds-wrapped/enlace.txt", "w");
    if (!f) return;
    fprintf(f, "%s\n", url);
    fclose(f);
}

static bool encode(NameFn fn) {
    pld_url(&stats, WRAPPED_URL, fn, url, sizeof(url));
    qrScale = 0;
    if (!qrcodegen_encodeText(url, qrTemp, qr, qrcodegen_Ecc_LOW, qrcodegen_VERSION_MIN, qrcodegen_VERSION_MAX,
                              qrcodegen_Mask_AUTO, true))
        return false;
    qrScale = TOP_H / (qrcodegen_getSize(qr) + 8);
    return qrScale >= 2;
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
    names_dump(f);
    fclose(f);
}

static void build(const Chunk *chunks, int n, u16 year) {
    pld_year_stats(chunks, n, year, &stats);
    // names make the code denser; drop them if the modules would get too small to scan
    if (!encode(names_get)) encode(NULL);
    save_link();
    // drawn once per change, redrawing every frame tears on a single buffer
    draw_qr();
    gfxFlushBuffers();
}

static void print_screen(const char *source, u16 *years, int nyears, int sel) {
    consoleClear();
    printf("\x1b[1;2H\x1b[31m3DS Wrapped\x1b[0m\n\n");
    printf("  Datos: %s\n\n", source);

    printf("  A\xA4o:  %s %u %s\n\n", sel > 0 ? "<" : " ", years[sel], sel < nyears - 1 ? ">" : " ");

    printf("  Horas jugadas   %lu\n", (unsigned long)(stats.totalSecs / 3600));
    printf("  Juegos          %d\n", stats.ntitles);
    printf("  D\xA1" "as jugados    %u\n", stats.daysPlayed);
    printf("  Partidas        %u\n", stats.sessions);
    printf("  Racha           %u d\xA1" "as\n\n", stats.streakLen);

    for (int i = 0; i < 3 && i < stats.ntitles; i++) {
        const TitleStat *t = &stats.titles[i];
        const char *n = names_get(t->tid);
        char ascii[26];
        if (n) names_ascii(n, ascii, sizeof(ascii));
        else snprintf(ascii, sizeof(ascii), "%08lX", (unsigned long)(u32)t->tid);
        printf("  %d. %-25s\n     %lu h\n", i + 1, ascii, (unsigned long)(t->secs / 3600));
    }
    printf("\n");

    if (qrScale) {
        printf("  Escanea el QR de arriba con\n");
        printf("  la c\xA0mara del m\xA2vil.\n");
        printf("  Enlace: sd:/3ds/3ds-wrapped/\n          enlace.txt\n");
    } else {
        printf("  \x1b[31mNo cabe el QR.\x1b[0m\n");
    }

    printf("\x1b[27;2H\x11\x10 cambiar a\xA4o   START salir");
}

int main(void) {
    gfxInitDefault();
    gfxSetDoubleBuffering(GFX_TOP, false);
    consoleInit(GFX_BOTTOM, NULL);

    const char *source = NULL;
    u8 *buf = pld_load(&source);
    names_init();
    bool loaded = buf != NULL;
    Chunk *chunks = NULL;
    int n = 0, nyears = 0, sel = 0;
    u16 years[64];

    if (loaded) {
        n = pld_chunks(buf, &chunks);
        free(buf);
        nyears = pld_years(chunks, n, years, 64);
    }
    mkdir("sdmc:/3ds", 0777);
    mkdir("sdmc:/3ds/3ds-wrapped", 0777);
    write_diagnostics(source, chunks, n);

    if (!nyears) {
        printf("\x1b[1;2H\x1b[31m3DS Wrapped\x1b[0m\n\n");
        if (!loaded) {
            printf("  No se pudo leer el Registro\n  de actividad.\n\n");
            printf("  Abre el Registro de actividad\n  una vez y vuelve a intentarlo,\n");
            printf("  o copia tu pld.dat a:\n  sd:/3ds/3ds-wrapped/pld.dat\n");
        } else {
            printf("  El Registro de actividad est\xA0\n  vac\xA1o.\n");
        }
        printf("\n  Pulsa START para salir.");
        draw_qr();
        gfxFlushBuffers();
    } else {
        // latest year, unless it has barely started
        sel = nyears - 1;
        build(chunks, n, years[sel]);
        if (sel > 0 && stats.daysPlayed < 7) build(chunks, n, years[--sel]);
        print_screen(source, years, nyears, sel);
    }

    while (aptMainLoop()) {
        hidScanInput();
        u32 down = hidKeysDown();
        if (down & KEY_START) break;

        if (nyears) {
            int prev = sel;
            if ((down & (KEY_LEFT | KEY_L)) && sel > 0) sel--;
            if ((down & (KEY_RIGHT | KEY_R)) && sel < nyears - 1) sel++;
            if (sel != prev) {
                build(chunks, n, years[sel]);
                print_screen(source, years, nyears, sel);
            }
        }

        gfxSwapBuffers();
        gspWaitForVBlank();
    }

    free(chunks);
    names_exit();
    gfxExit();
    return 0;
}
