#include "pld.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define DAY  86400
#define HOUR 3600

#ifdef __3DS__
#include <3ds.h>

// Activity Log system save ids, indexed by CFG region (JPN USA EUR AUS CHN KOR TWN)
static const u32 SAVE_IDS[] = {0x00020202, 0x00020212, 0x00020222, 0x00020222, 0x00020262, 0x00020272, 0x00020282};
#define NUM_SAVE_IDS (sizeof(SAVE_IDS) / sizeof(SAVE_IDS[0]))

static const char *SD_PATH = "sdmc:/3ds/3ds-wrapped/pld.dat";

static bool read_from_save(u32 saveId, u8 *buf) {
    u32 path[2] = {MEDIATYPE_NAND, saveId};
    FS_Archive arch;
    if (R_FAILED(FSUSER_OpenArchive(&arch, ARCHIVE_SYSTEM_SAVEDATA, (FS_Path){PATH_BINARY, sizeof(path), path})))
        return false;

    bool ok = false;
    Handle file;
    if (R_SUCCEEDED(FSUSER_OpenFile(&file, arch, fsMakePath(PATH_ASCII, "/pld.dat"), FS_OPEN_READ, 0))) {
        u64 size = 0;
        u32 read = 0;
        if (R_SUCCEEDED(FSFILE_GetSize(file, &size)) && size == PLD_SIZE &&
            R_SUCCEEDED(FSFILE_Read(file, &read, 0, buf, PLD_SIZE)) && read == PLD_SIZE)
            ok = true;
        FSFILE_Close(file);
    }
    FSUSER_CloseArchive(arch);
    return ok;
}

static bool read_from_sd(u8 *buf) {
    FILE *f = fopen(SD_PATH, "rb");
    if (!f) return false;
    bool ok = fread(buf, 1, PLD_SIZE, f) == PLD_SIZE && fgetc(f) == EOF;
    fclose(f);
    return ok;
}

u8 *pld_load(const char **source) {
    u8 *buf = malloc(PLD_SIZE);
    if (!buf) return NULL;

    u8 region = 0xFF;
    if (R_SUCCEEDED(cfguInit())) {
        CFGU_SecureInfoGetRegion(&region);
        cfguExit();
    }
    if (region < NUM_SAVE_IDS && read_from_save(SAVE_IDS[region], buf)) {
        *source = "Registro de actividad";
        return buf;
    }
    for (size_t i = 0; i < NUM_SAVE_IDS; i++) {
        if (i != region && read_from_save(SAVE_IDS[i], buf)) {
            *source = "Registro de actividad";
            return buf;
        }
    }
    if (read_from_sd(buf)) {
        *source = SD_PATH;
        return buf;
    }
    free(buf);
    return NULL;
}
#endif

static int cmp_chunk(const void *a, const void *b) {
    const Chunk *x = a, *y = b;
    return (x->ts > y->ts) - (x->ts < y->ts);
}

int pld_chunks(const u8 *buf, Chunk **out) {
    Chunk *list = malloc(sizeof(Chunk) * PLD_LOG_ENTRIES);
    if (!list) return 0;
    int n = 0;
    for (int i = 0; i < PLD_LOG_ENTRIES; i++) {
        const u8 *e = buf + PLD_LOG_OFFSET + i * 16;
        u64 tid;
        u32 ts, secs;
        memcpy(&tid, e, 8);
        memcpy(&ts, e + 8, 4);
        memcpy(&secs, e + 12, 4);
        if (tid == 0 || tid == ~0ULL || secs == 0 || secs > HOUR) continue;
        list[n++] = (Chunk){tid, ts, secs};
    }
    // ring buffer, not in order
    qsort(list, n, sizeof(Chunk), cmp_chunk);
    *out = list;
    return n;
}

static bool is_leap(int y) { return (y % 4 == 0 && y % 100 != 0) || y % 400 == 0; }

static u32 jan1(int year) {
    u32 d = 0;
    for (int y = 2000; y < year; y++) d += is_leap(y) ? 366 : 365;
    return d;
}

static int year_of(u32 ts) {
    u32 day = ts / DAY;
    int y = 2000;
    for (;;) {
        u32 len = is_leap(y) ? 366 : 365;
        if (day < len) return y;
        day -= len;
        y++;
    }
}

int pld_years(const Chunk *chunks, int n, u16 *years, int max) {
    int count = 0;
    for (int i = 0; i < n; i++) {
        u16 y = year_of(chunks[i].ts);
        if (count && years[count - 1] == y) continue;  // chunks are sorted
        if (count < max) years[count++] = y;
    }
    return count;
}

static TitleStat *find_title(YearStats *ys, u64 tid) {
    for (int i = 0; i < ys->ntitles; i++)
        if (ys->titles[i].tid == tid) return &ys->titles[i];
    if (ys->ntitles >= MAX_TITLES) return NULL;
    TitleStat *t = &ys->titles[ys->ntitles++];
    memset(t, 0, sizeof(*t));
    t->tid = tid;
    return t;
}

static void close_session(YearStats *ys, TitleStat *t) {
    if (!t->curOpen) return;
    t->curOpen = false;
    if (!ys->hasSessions || t->curSecs > ys->longestSecs) {
        ys->longestTid = t->tid;
        ys->longestSecs = t->curSecs;
        ys->longestStart = t->curStart;
    }
    if (!ys->hasSessions || t->curStart < ys->firstStart) {
        ys->firstTid = t->tid;
        ys->firstStart = t->curStart;
    }
    ys->hasSessions = true;
}

static int cmp_title(const void *a, const void *b) {
    const TitleStat *x = a, *y = b;
    return (x->secs < y->secs) - (x->secs > y->secs);
}

static const u8 MONTH_DAYS[12] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};

void pld_year_stats(const Chunk *chunks, int n, u16 year, YearStats *ys) {
    memset(ys, 0, sizeof(*ys));
    ys->year = year;
    ys->daysInYear = is_leap(year) ? 366 : 365;
    u32 from = jan1(year) * DAY;
    u32 to = from + ys->daysInYear * DAY;

    for (int i = 0; i < n; i++) {
        const Chunk *c = &chunks[i];
        if (c->ts < from || c->ts >= to) continue;
        TitleStat *t = find_title(ys, c->tid);
        if (!t) continue;

        u16 doy = (c->ts - from) / DAY;
        ys->totalSecs += c->secs;
        ys->daySecs[doy] += c->secs;
        ys->hourSecs[(c->ts % DAY) / HOUR] += c->secs;
        t->secs += c->secs;
        t->lastDoy = doy;

        // the log is per hour: consecutive hours of the same title count as one session
        if (t->curOpen && c->ts == t->curLastTs + HOUR) {
            if (!t->curMerged) {
                t->curStart += HOUR - t->curFirstSecs;
                t->curMerged = true;
            }
            t->curSecs += c->secs;
            t->curLastTs = c->ts;
            continue;
        }
        close_session(ys, t);
        t->sessions++;
        ys->sessions++;
        t->curOpen = true;
        t->curMerged = false;
        t->curStart = t->curLastTs = c->ts;
        t->curSecs = t->curFirstSecs = c->secs;
    }
    for (int i = 0; i < ys->ntitles; i++) close_session(ys, &ys->titles[i]);
    qsort(ys->titles, ys->ntitles, sizeof(TitleStat), cmp_title);

    int month = 0, monthEnd = MONTH_DAYS[0];
    u16 run = 0;
    for (u16 d = 0; d < ys->daysInYear; d++) {
        if (d >= monthEnd) {
            month++;
            monthEnd += MONTH_DAYS[month] + (month == 1 && is_leap(year));
        }
        u32 s = ys->daySecs[d];
        ys->monthSecs[month] += s;
        if (s > ys->bestSecs) {
            ys->bestSecs = s;
            ys->bestDoy = d;
        }
        if (s) {
            ys->daysPlayed++;
            run++;
            if (run > ys->streakLen) {
                ys->streakLen = run;
                ys->streakFrom = d + 1 - run;
            }
        } else {
            run = 0;
        }
    }
}

// ---- lifetime ----

int pld_library(const u8 *buf, LibEntry *out, int max) {
    int n = 0;
    for (int i = 0; i < PLD_LIB_ENTRIES && n < max; i++) {
        const u8 *e = buf + PLD_LIB_OFFSET + i * 24;
        u64 tid;
        memcpy(&tid, e, 8);
        if (tid == 0 || tid == ~0ULL) continue;
        LibEntry *l = &out[n];
        l->tid = tid;
        memcpy(&l->secs, e + 8, 4);
        memcpy(&l->launches, e + 12, 2);
        memcpy(&l->firstDay, e + 16, 2);
        memcpy(&l->lastDay, e + 18, 2);
        if (!l->secs && !l->launches) continue;
        n++;
    }
    return n;
}

void pld_lifetime(const u8 *buf, const Chunk *chunks, int n, Lifetime *lt) {
    memset(lt, 0, sizeof(*lt));
    static LibEntry lib[PLD_LIB_ENTRIES];
    int nl = buf ? pld_library(buf, lib, PLD_LIB_ENTRIES) : 0;

    if (nl) {
        lt->firstDay = 0xFFFF;
        for (int i = 0; i < nl; i++) {
            lt->totalSecs += lib[i].secs;
            lt->launches += lib[i].launches;
            lt->titles++;
            if (lib[i].firstDay && lib[i].firstDay < lt->firstDay) lt->firstDay = lib[i].firstDay;
            if (lib[i].secs > lt->topSecs) {
                lt->topSecs = lib[i].secs;
                lt->topTid = lib[i].tid;
                lt->topLaunches = lib[i].launches;
            }
        }
        if (lt->firstDay == 0xFFFF) lt->firstDay = 0;
    } else if (n) {
        // no summary: rebuild it from the hourly log
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
            lt->totalSecs += chunks[i].secs;
        }
        lt->titles = nt;
        lt->firstDay = chunks[0].ts / DAY;  // chunks are sorted
        for (int j = 0; j < nt; j++) {
            if (secs[j] > lt->topSecs) { lt->topSecs = secs[j]; lt->topTid = tids[j]; }
        }
    }

    u16 years[64];
    int ny = pld_years(chunks, n, years, 64);
    static YearStats tmp;
    for (int i = ny > MAX_HISTORY ? ny - MAX_HISTORY : 0; i < ny; i++) {
        pld_year_stats(chunks, n, years[i], &tmp);
        YearSummary *y = &lt->years[lt->nyears++];
        y->year = years[i];
        y->secs = tmp.totalSecs;
        y->days = tmp.daysPlayed;
        y->games = tmp.ntitles;
    }
}

// ---- payload ----

typedef struct {
    u8 *p;
    int len, cap;
} Writer;

static void put(Writer *w, u32 v, int bytes) {
    for (int i = 0; i < bytes; i++)
        if (w->len < w->cap) w->p[w->len++] = (v >> (8 * i)) & 0xFF;
}

static u32 minutes(u32 secs) { return (secs + 30) / 60; }
static u32 cap(u32 v, u32 max) { return v > max ? max : v; }

static void put_tid(Writer *w, u64 tid) {
    put(w, (u32)(tid >> 32) & 0xFFFF, 2);  // high word is always 0x0004xxxx
    put(w, (u32)tid, 4);
}

#define MAX_NAME_BYTES 24

// retail and eShop titles use small unique ids (< 0x10000); homebrew and VC use big ones
bool pld_needs_name(u64 tid) {
    u32 hi = tid >> 32;
    u32 unique = ((u32)tid >> 8) & 0xFFFFF;
    return hi != 0x00040000 || unique >= 0x10000;
}

static void put_name(Writer *w, u64 tid, NameFn names) {
    const char *n = (names && pld_needs_name(tid)) ? names(tid) : NULL;
    int len = n ? (int)strlen(n) : 0;
    if (len > MAX_NAME_BYTES) {
        len = MAX_NAME_BYTES;
        while (len > 0 && ((u8)n[len] & 0xC0) == 0x80) len--;  // don't cut a UTF-8 sequence
    }
    put(w, len, 1);
    for (int i = 0; i < len; i++) put(w, (u8)n[i], 1);
}

static int build_payload(const YearStats *ys, const Extras *ex, NameFn names, u8 *buf, int cap_) {
    Writer w = {buf, 0, cap_};
    put(&w, ex ? 3 : 2, 1);  // version
    put(&w, ys->year, 2);
    put(&w, minutes(ys->totalSecs), 4);
    put(&w, ys->sessions, 2);
    put(&w, ys->ntitles, 2);
    put(&w, ys->daysPlayed, 2);

    int top = ys->ntitles < TOP_TITLES ? ys->ntitles : TOP_TITLES;
    put(&w, top, 1);
    for (int i = 0; i < top; i++) {
        const TitleStat *t = &ys->titles[i];
        put_tid(&w, t->tid);
        put(&w, cap(minutes(t->secs), 0xFFFFFF), 3);
        put(&w, t->sessions, 2);
        put(&w, t->lastDoy, 2);
        put_name(&w, t->tid, names);
    }

    u32 maxHour = 1;
    for (int h = 0; h < 24; h++) if (ys->hourSecs[h] > maxHour) maxHour = ys->hourSecs[h];
    for (int h = 0; h < 24; h++) put(&w, (u32)((u64)ys->hourSecs[h] * 255 / maxHour), 1);

    for (int m = 0; m < 12; m++) put(&w, cap(minutes(ys->monthSecs[m]), 0xFFFF), 2);

    put(&w, ys->bestDoy, 2);
    put(&w, cap(minutes(ys->bestSecs), 0xFFFF), 2);
    put(&w, ys->streakLen, 2);
    put(&w, ys->streakFrom, 2);

    u32 from = jan1(ys->year) * DAY;
    put_tid(&w, ys->longestTid);
    put(&w, cap(minutes(ys->longestSecs), 0xFFFF), 2);
    put(&w, ys->hasSessions ? (ys->longestStart - from) / DAY : 0, 2);
    put(&w, (ys->longestStart % DAY) / HOUR, 1);
    put_name(&w, ys->longestTid, names);

    put_tid(&w, ys->firstTid);
    put(&w, ys->hasSessions ? (ys->firstStart - from) / DAY : 0, 2);
    put(&w, (ys->firstStart % DAY) / HOUR, 1);
    put_name(&w, ys->firstTid, names);

    // one nibble per day: ceil(minutes / 15), max 15
    for (int d = 0; d < ys->daysInYear; d += 2) {
        u8 lo = cap((minutes(ys->daySecs[d]) + 14) / 15, 15);
        u8 hi = d + 1 < ys->daysInYear ? cap((minutes(ys->daySecs[d + 1]) + 14) / 15, 15) : 0;
        put(&w, lo | (hi << 4), 1);
    }

    // v3: lifetime, steps and one row per year (see docs/QR.md)
    if (ex) {
        const Lifetime *lt = ex->lt;
        u8 flags = (lt ? 1 : 0) | (lt && lt->nyears ? 2 : 0) | (ex->hasSteps ? 4 : 0);
        put(&w, flags, 1);
        if (flags & 1) {
            put(&w, minutes(lt->totalSecs), 4);
            put(&w, lt->launches, 4);
            put(&w, lt->titles, 2);
            put(&w, lt->firstDay, 2);
            put_tid(&w, lt->topTid);
            put(&w, cap(minutes(lt->topSecs), 0xFFFFFF), 3);
            put(&w, lt->topLaunches, 2);
            put_name(&w, lt->topTid, names);
        }
        if (flags & 4) {
            put(&w, ex->stepsTotal, 4);
            put(&w, ex->stepsYear, 4);
        }
        if (flags & 2) {
            put(&w, lt->nyears, 1);
            for (int i = 0; i < lt->nyears; i++) {
                put(&w, lt->years[i].year, 2);
                put(&w, cap(minutes(lt->years[i].secs), 0xFFFFFF), 3);
                put(&w, lt->years[i].days, 2);
                put(&w, lt->years[i].games, 2);
            }
        }
    }
    return w.len;
}

static const char B64[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

int pld_url(const YearStats *ys, const Extras *ex, const char *base, NameFn names, char *out, int outlen) {
    u8 data[1024];
    int n = build_payload(ys, ex, names, data, sizeof(data));

    int len = snprintf(out, outlen, "%s#w=", base);
    for (int i = 0; i < n && len + 4 < outlen; i += 3) {
        u32 v = data[i] << 16;
        if (i + 1 < n) v |= data[i + 1] << 8;
        if (i + 2 < n) v |= data[i + 2];
        out[len++] = B64[(v >> 18) & 63];
        out[len++] = B64[(v >> 12) & 63];
        if (i + 1 < n) out[len++] = B64[(v >> 6) & 63];
        if (i + 2 < n) out[len++] = B64[v & 63];
    }
    out[len] = '\0';
    return len;
}
