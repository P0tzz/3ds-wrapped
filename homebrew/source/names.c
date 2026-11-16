#include "names.h"

#include <3ds.h>
#include <string.h>

#define IDB_COUNT        0x200
#define IDB_ENTRY_SIZE   0x36A0  // 0x20 header + 16 x 0x200 titles + small/large icon
#define IDB_TITLES_OFF   0x20
#define IDB_TITLE_SIZE   0x200   // short (0x80) + long (0x100) + publisher (0x80), UTF-16
#define SHORT_NAME_CHARS 0x40

// DS titles keep the DS banner layout in the same slot: names at 0x240, 0x100 bytes per language
#define TWL_TITLES_OFF   0x240
#define TWL_TITLE_SIZE   0x100
#define TWL_TITLE_CHARS  0x80

static bool is_twl(u64 tid) { return (tid >> 32) == 0x00048004; }

static FS_Archive arch;
static Handle idb;
static bool ready;
static u8 lang = 1;
static u64 tids[IDB_COUNT];
static u8 raw[IDB_COUNT * 16];
static char name[SHORT_NAME_CHARS * 3 + 1];

// diagnostics
static Result rArch, rIdbt, rIdbtRead, rIdb;
static u32 idbtBytes;

bool names_init(void) {
    u32 path[3] = {MEDIATYPE_NAND, 0xF000000B, 0x00048000};
    rArch = FSUSER_OpenArchive(&arch, ARCHIVE_SHARED_EXTDATA, (FS_Path){PATH_BINARY, sizeof(path), path});
    if (R_FAILED(rArch)) return false;

    Handle t;
    u32 read = 0;
    rIdbt = FSUSER_OpenFile(&t, arch, fsMakePath(PATH_ASCII, "/idbt.dat"), FS_OPEN_READ, 0);
    if (R_FAILED(rIdbt)) goto fail;
    Result res = rIdbtRead = FSFILE_Read(t, &read, 0, raw, sizeof(raw));
    idbtBytes = read;
    FSFILE_Close(t);
    if (R_FAILED(res)) goto fail;
    for (u32 i = 0; i < IDB_COUNT; i++) {
        tids[i] = 0;
        if ((i + 1) * 16 <= read) memcpy(&tids[i], raw + i * 16 + 8, 8);
    }

    rIdb = FSUSER_OpenFile(&idb, arch, fsMakePath(PATH_ASCII, "/idb.dat"), FS_OPEN_READ, 0);
    if (R_FAILED(rIdb)) goto fail;

    if (R_SUCCEEDED(cfguInit())) {
        CFGU_GetSystemLanguage(&lang);
        cfguExit();
    }
    if (lang >= 16) lang = 1;
    ready = true;
    return true;

fail:
    FSUSER_CloseArchive(arch);
    return false;
}

void names_exit(void) {
    if (!ready) return;
    FSFILE_Close(idb);
    FSUSER_CloseArchive(arch);
    ready = false;
}

static bool utf16_name(const u16 *utf16) {
    if (!utf16[0]) return false;
    ssize_t len = utf16_to_utf8((u8 *)name, utf16, sizeof(name) - 1);
    if (len <= 0) return false;
    name[len] = '\0';
    // names sometimes have a line break between title and subtitle
    for (char *c = name; *c; c++) if (*c == '\n') *c = ' ';
    return name[0] != '\0';
}

static bool read_name(u32 index, u8 l) {
    u16 utf16[SHORT_NAME_CHARS + 1] = {0};
    u32 read = 0;
    u64 off = (u64)index * IDB_ENTRY_SIZE + IDB_TITLES_OFF + l * IDB_TITLE_SIZE;
    if (R_FAILED(FSFILE_Read(idb, &read, off, utf16, SHORT_NAME_CHARS * 2))) return false;
    return utf16_name(utf16);
}

// DS banner title: "Title\nSubtitle\nPublisher" -> "Title Subtitle"
static bool read_twl_name(u32 index, u8 l) {
    u16 utf16[TWL_TITLE_CHARS + 1] = {0};
    u32 read = 0;
    u64 off = (u64)index * IDB_ENTRY_SIZE + TWL_TITLES_OFF + l * TWL_TITLE_SIZE;
    if (R_FAILED(FSFILE_Read(idb, &read, off, utf16, TWL_TITLE_CHARS * 2)) || !utf16[0]) return false;
    int lastBreak = -1;
    for (int i = 0; i < TWL_TITLE_CHARS && utf16[i]; i++) if (utf16[i] == '\n') lastBreak = i;
    if (lastBreak > 0) utf16[lastBreak] = 0;  // drop the publisher line
    return utf16_name(utf16);
}

// SMDH of an installed title (homebrew that never made it into the cache)
static bool installed_name(u64 tid, u8 l) {
    static u8 smdh[0x36C0];
    const FS_MediaType media[] = {MEDIATYPE_SD, MEDIATYPE_NAND};
    for (int m = 0; m < 2; m++) {
        u32 archPath[4] = {(u32)tid, (u32)(tid >> 32), media[m], 0};
        u32 filePath[5] = {0, 0, 2, 0x6E6F6369 /* "icon" */, 0};
        Handle h;
        if (R_FAILED(FSUSER_OpenFileDirectly(&h, ARCHIVE_SAVEDATA_AND_CONTENT,
                                             (FS_Path){PATH_BINARY, sizeof(archPath), archPath},
                                             (FS_Path){PATH_BINARY, sizeof(filePath), filePath}, FS_OPEN_READ, 0)))
            continue;
        u32 read = 0;
        Result res = FSFILE_Read(h, &read, 0, smdh, sizeof(smdh));
        FSFILE_Close(h);
        if (R_FAILED(res) || read < 0x8 + 16 * 0x200 || memcmp(smdh, "SMDH", 4)) continue;
        u16 utf16[SHORT_NAME_CHARS + 1] = {0};
        for (int k = 0; k < 2; k++) {
            u8 lang_ = k == 0 ? l : 1;
            memcpy(utf16, smdh + 0x8 + lang_ * 0x200, SHORT_NAME_CHARS * 2);
            if (utf16_name(utf16)) return true;
        }
    }
    return false;
}

const char *names_get(u64 tid) {
    if (ready) {
        for (u32 i = 0; i < IDB_COUNT; i++) {
            if (tids[i] != tid) continue;
            if (is_twl(tid)) {
                u8 l = lang < 8 ? lang : 1;
                if (read_twl_name(i, l) || read_twl_name(i, 1) || read_twl_name(i, 0)) return name;
                continue;  // there can be more than one slot for the same title
            }
            if (read_name(i, lang) || read_name(i, 1)) return name;  // system language, then English
            for (u8 l = 0; l < 16; l++) if (read_name(i, l)) return name;
        }
    }
    if (!is_twl(tid) && installed_name(tid, lang < 16 ? lang : 1)) return name;
    return NULL;
}

void names_dump(FILE *f) {
    fprintf(f, "[cache de nombres]\n");
    fprintf(f, "archivo extdata: %08lX  idbt: %08lX  lectura: %08lX (%lu bytes)  idb: %08lX  idioma: %u\n",
            rArch, rIdbt, rIdbtRead, idbtBytes, rIdb, lang);
    if (!ready) return;
    int count = 0;
    for (u32 i = 0; i < IDB_COUNT; i++) {
        if (!tids[i] || tids[i] == ~0ULL) continue;
        u64 unk;
        memcpy(&unk, raw + i * 16, 8);
        bool ok = is_twl(tids[i]) ? (read_twl_name(i, lang < 8 ? lang : 1) || read_twl_name(i, 1))
                                  : (read_name(i, lang) || read_name(i, 1));
        fprintf(f, "%3lu  %016llX  %016llX  %s\n", i, tids[i], unk, ok ? name : "(sin nombre)");
        if (is_twl(tids[i])) {
            // raw bytes of the slot, to check the layout if the name is still missing
            u8 b[16];
            u32 read = 0;
            for (u32 off = 0x220; off <= 0x260; off += 0x20) {
                FSFILE_Read(idb, &read, (u64)i * IDB_ENTRY_SIZE + off, b, sizeof(b));
                fprintf(f, "       +%03lX:", off);
                for (int k = 0; k < 16; k++) fprintf(f, " %02X", b[k]);
                fprintf(f, "\n");
            }
        }
        count++;
    }
    fprintf(f, "entradas: %d\n", count);
}

static const char LATIN1[] =  // U+00C0..U+00FF
    "AAAAAAACEEEEIIII" "DNOOOOOxOUUUUYPs"
    "aaaaaaaceeeeiiii" "dnooooo/ouuuuypy";

void names_ascii(const char *s, char *out, int outlen) {
    int o = 0;
    const u8 *p = (const u8 *)s;
    while (*p && o < outlen - 1) {
        u32 cp;
        if (*p < 0x80) cp = *p++;
        else if ((*p & 0xE0) == 0xC0 && p[1]) { cp = ((p[0] & 0x1F) << 6) | (p[1] & 0x3F); p += 2; }
        else if ((*p & 0xF0) == 0xE0 && p[1] && p[2]) { cp = ((p[0] & 0x0F) << 12) | ((p[1] & 0x3F) << 6) | (p[2] & 0x3F); p += 3; }
        else { p++; while ((*p & 0xC0) == 0x80) p++; cp = '?'; }

        if (cp >= 0xC0 && cp <= 0xFF) out[o++] = LATIN1[cp - 0xC0];
        else if (cp == 0x2122 || cp == 0xAE || cp == 0xA9) continue;  // TM (R) (C)
        else if (cp >= 0x20 && cp < 0x7F) out[o++] = (char)cp;
        else if (cp == 0x2019 || cp == 0x2018) out[o++] = '\'';
        else out[o++] = '?';
    }
    out[o] = '\0';
}
