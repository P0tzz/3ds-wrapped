#include "names.h"

#include <3ds.h>
#include <string.h>

#define IDB_COUNT        0x200
#define IDB_ENTRY_SIZE   0x36A0  // 0x20 header + 16 x 0x200 titles + small/large icon
#define IDB_TITLES_OFF   0x20
#define IDB_TITLE_SIZE   0x200   // short (0x80) + long (0x100) + publisher (0x80), UTF-16
#define SHORT_NAME_CHARS 0x40

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

static bool read_name(u32 index, u8 l) {
    u16 utf16[SHORT_NAME_CHARS + 1] = {0};
    u32 read = 0;
    u64 off = (u64)index * IDB_ENTRY_SIZE + IDB_TITLES_OFF + l * IDB_TITLE_SIZE;
    if (R_FAILED(FSFILE_Read(idb, &read, off, utf16, SHORT_NAME_CHARS * 2)) || !utf16[0]) return false;

    ssize_t len = utf16_to_utf8((u8 *)name, utf16, sizeof(name) - 1);
    if (len <= 0) return false;
    name[len] = '\0';
    // names sometimes have a line break between title and subtitle
    for (char *c = name; *c; c++) if (*c == '\n') *c = ' ';
    return true;
}

const char *names_get(u64 tid) {
    if (!ready) return NULL;
    for (u32 i = 0; i < IDB_COUNT; i++) {
        if (tids[i] != tid) continue;
        if (read_name(i, lang) || read_name(i, 1)) return name;  // system language, then English
        for (u8 l = 0; l < 16; l++) if (read_name(i, l)) return name;
        return NULL;
    }
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
        bool ok = read_name(i, lang) || read_name(i, 1);
        fprintf(f, "%3lu  %016llX  %016llX  %s\n", i, tids[i], unk, ok ? name : "(sin nombre)");
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
