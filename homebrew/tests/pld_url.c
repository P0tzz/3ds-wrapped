// host tool: prints the wrapped link for every year in a pld.dat
// gcc -Isource source/pld.c tests/pld_url.c -o pld_url && ./pld_url tests/fixture-pld.bin
#include <stdio.h>
#include <stdlib.h>

#include "pld.h"

// stand-in for the console's name cache
static const char *fake_name(u64 tid) {
    static char buf[64];
    snprintf(buf, sizeof(buf), "Juego de prueba %08X ñ", (unsigned)(u32)tid);
    return buf;
}

int main(int argc, char **argv) {
    if (argc < 2) {
        fprintf(stderr, "uso: %s pld.dat\n", argv[0]);
        return 2;
    }
    FILE *f = fopen(argv[1], "rb");
    if (!f) {
        perror(argv[1]);
        return 1;
    }
    u8 *buf = malloc(PLD_SIZE);
    size_t n = fread(buf, 1, PLD_SIZE, f);
    fclose(f);
    if (n != PLD_SIZE) {
        fprintf(stderr, "tamaño incorrecto: %zu\n", n);
        return 1;
    }

    Chunk *chunks;
    int count = pld_chunks(buf, &chunks);
    u16 years[64];
    int ny = pld_years(chunks, count, years, 64);

    static YearStats ys;
    static Lifetime lt;
    static char url[1600];
    pld_lifetime(buf, chunks, count, &lt);
    Extras ex = {&lt, true, 123456, 0};
    for (int i = 0; i < ny; i++) {
        pld_year_stats(chunks, count, years[i], &ys);
        ex.stepsYear = 1000 * (i + 1);
        int len = pld_url(&ys, &ex, "https://p0tzz.github.io/3ds-wrapped/", fake_name, url, sizeof(url));
        printf("%u %d %s\n", years[i], len, url);
    }
    free(chunks);
    free(buf);
    return 0;
}
