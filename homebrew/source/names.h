#pragma once

#include <3ds/types.h>
#include <stdbool.h>

// Title names from the Activity Log icon cache (shared extdata 0xF000000B: idbt.dat + idb.dat).
// Covers everything the console has logged: retail, DS/DSiWare, homebrew, system apps.

bool names_init(void);
void names_exit(void);

// UTF-8 name in the system language, or NULL. Points to a static buffer.
const char *names_get(u64 tid);

// 48x48 HOME Menu icon (RGB565, already in the GPU tile order) into out[48*48]. false if there is none.
bool names_icon(u64 tid, u16 *out);

// writes what the name cache contains (for bug reports)
#include <stdio.h>
void names_dump(FILE *f);

// ASCII-only copy for the console font
void names_ascii(const char *utf8, char *out, int outlen);
