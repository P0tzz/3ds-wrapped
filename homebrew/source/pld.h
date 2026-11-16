#pragma once

#include <stdbool.h>

#ifdef __3DS__
#include <3ds/types.h>
#else
// host build (tests)
#include <stdint.h>
typedef uint8_t u8;
typedef uint16_t u16;
typedef uint32_t u32;
typedef uint64_t u64;
#endif

#define PLD_SIZE        806160
#define PLD_LOG_OFFSET  0x10
#define PLD_LOG_ENTRIES 50000

#define MAX_TITLES 512
#define TOP_TITLES 8

typedef struct {
    u64 tid;
    u32 ts;    // seconds since 2000-01-01 (console local time), start of the hour
    u32 secs;  // seconds played in that hour
} Chunk;

typedef struct {
    u64 tid;
    u32 secs;
    u16 sessions;
    u16 lastDoy;
    // current session while merging
    u32 curStart, curLastTs, curSecs, curFirstSecs;
    bool curOpen, curMerged;
} TitleStat;

typedef struct {
    u16 year;
    u16 daysInYear;
    u32 totalSecs;
    u16 sessions;
    u16 daysPlayed;

    TitleStat titles[MAX_TITLES];
    int ntitles;

    u32 daySecs[366];
    u32 hourSecs[24];
    u32 monthSecs[12];

    u16 bestDoy;
    u32 bestSecs;
    u16 streakLen;
    u16 streakFrom;

    bool hasSessions;
    u64 longestTid;
    u32 longestSecs, longestStart;
    u64 firstTid;
    u32 firstStart;
} YearStats;

// reads pld.dat from the Activity Log system save, or from the SD card as a fallback.
// returns a malloc'd buffer of PLD_SIZE bytes or NULL. `source` describes where it came from.
#ifdef __3DS__
u8 *pld_load(const char **source);
#endif

// valid hourly entries sorted by time. returns count, *out is malloc'd.
int pld_chunks(const u8 *buf, Chunk **out);

int pld_years(const Chunk *chunks, int n, u16 *years, int max);

void pld_year_stats(const Chunk *chunks, int n, u16 year, YearStats *ys);

// title id -> UTF-8 name, or NULL
typedef const char *(*NameFn)(u64 tid);

// titles the website probably can't name by itself (DS, DSiWare, homebrew, demos, system)
bool pld_needs_name(u64 tid);

// "<base url>#w=<base64url payload>", see docs/QR.md. `names` may be NULL.
int pld_url(const YearStats *ys, const char *base, NameFn names, char *out, int outlen);
