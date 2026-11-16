// host tool: prints the wrapped link for every year in a pld.dat
// gcc -Isource source/pld.c tests/pld_url.c -o pld_url && ./pld_url tests/fixture-pld.bin
#include <stdio.h>
#include <stdlib.h>

#include "pld.h"

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
    static char url[1024];
    for (int i = 0; i < ny; i++) {
        pld_year_stats(chunks, count, years[i], &ys);
        int len = pld_url(&ys, "https://p0tzz.github.io/3ds-wrapped/", url, sizeof(url));
        printf("%u %d %s\n", years[i], len, url);
    }
    free(chunks);
    free(buf);
    return 0;
}
