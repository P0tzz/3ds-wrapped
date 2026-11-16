#pragma once

#include <3ds/types.h>
#include <stdbool.h>

// Title names from the Activity Log icon cache (shared extdata 0xF000000B: idbt.dat + idb.dat).
// Covers everything the console has logged: retail, DS/DSiWare, homebrew, system apps.

bool names_init(void);
void names_exit(void);

// UTF-8 name in the system language, or NULL. Points to a static buffer.
const char *names_get(u64 tid);

// ASCII-only copy for the console font
void names_ascii(const char *utf8, char *out, int outlen);
