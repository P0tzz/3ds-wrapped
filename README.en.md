<p align="center">
  <img src="img/logo.svg" width="96" height="96" alt="">
</p>

<h1 align="center">3DS Wrapped</h1>

<p align="center"><b>English</b> · <a href="README.md">Español</a></p>

<p align="center">
  Your year on the 3DS, "Wrapped" style: most played games, hours, streaks, medals and a card to share.
</p>

<p align="center">
  <a href="https://github.com/P0tzz/3ds-wrapped/releases/latest"><img src="https://img.shields.io/github/v/release/P0tzz/3ds-wrapped?label=3DS%20app&color=1f8bff" alt="Latest release"></a>
  <a href="https://github.com/P0tzz/3ds-wrapped/actions/workflows/build.yml"><img src="https://img.shields.io/github/actions/workflow/status/P0tzz/3ds-wrapped/build.yml?branch=main&label=build" alt="Build"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/P0tzz/3ds-wrapped?color=555" alt="MIT license"></a>
</p>

<p align="center">
  <a href="https://p0tzz.github.io/3ds-wrapped/#demo"><b>Try the demo</b></a> ·
  <a href="https://p0tzz.github.io/3ds-wrapped/"><b>Open the site</b></a> ·
  <a href="https://github.com/P0tzz/3ds-wrapped/releases/latest"><b>Download the app</b></a>
</p>

<p align="center">
  <img src="https://github.com/user-attachments/assets/66d3002d-e8c5-42cc-9f0a-304a47794c64" width="100%" alt="Year summary on the site: game of the year, hours, games, days and library">
</p>

## How it works

| | |
|---|---|
| **1. Open the app on your 3DS** | It reads the console's Activity Log. Read-only: nothing is changed. |
| **2. Scan the QR** | The console works out your year and shows it as a QR code. |
| **3. See your year** | Your phone opens the site with your games, hours and streaks, with box art. |

The data travels inside the QR link. No accounts, no servers: nothing is stored anywhere else.

## Install the app

You need a 3DS with custom firmware (Luma3DS).

- **With FBI:** download **`3ds-wrapped.cia`** from the [latest release](https://github.com/P0tzz/3ds-wrapped/releases/latest), install it and open it from the HOME Menu.
- **With the Homebrew Launcher:** download **`3ds-wrapped.3dsx`** and copy it to the **`3ds`** folder on the SD card.

The app follows the console language (Spanish or English). The site has an ES / EN switch.

## What it shows

- Total hours, games, days played and sessions, compared with the previous year.
- Your game of the year and your library, with box art.
- Hours by month, by weekday and by hour of the day, plus a calendar of the whole year.
- Longest streak, longest session, biggest day, first game of the year and the forgotten one.
- **10 medals** based on how you play: Night owl, Marathon, Loyal, Collector…
- **Your whole 3DS**: hours since you got the console, how often you opened each game and the **steps** counted by the pedometer.
- An animated intro that changes with your most played game.
- A card to download or share from your phone, as a post or a story.

Recognises 3DS games, DS games, DSiWare, homebrew (FBI, Checkpoint, PKSM…) and system apps.

## FAQ

**Do I need a modded console?**
Yes. The Activity Log is system save data and can only be read with homebrew.

**Is my data uploaded anywhere?**
No. The app puts the summary in the QR link and the site works it all out in your browser.

**A DS game shows up as "DS games (TWiLight / flashcart)".**
Games launched from TWiLight Menu++ or a flashcart are logged without a game code. On the site, tap "Which game is it?" on that card and pick it.

**My phone can't read the QR.**
Get closer so the code fills the screen and turn up the console brightness. The link is also saved to `sd:/3ds/3ds-wrapped/enlace.txt`.

**My hours are out of date.**
The console only updates the log when you open the *Activity Log* app. Open it once before using 3DS Wrapped.

**Something is wrong or a name is missing.**
Open an [issue](https://github.com/P0tzz/3ds-wrapped/issues/new/choose) and attach `sd:/3ds/3ds-wrapped/diagnostico.txt`, which the app writes every time it starts.

## Credits

- [HarshNarayanJha/3DS-ActivityLog](https://github.com/HarshNarayanJha/3DS-ActivityLog): `pld.dat` format.
- [Ryuzaki-MrL/Cthulhu](https://github.com/Ryuzaki-MrL/Cthulhu): location of the save and the icon cache.
- [davidthebard/activity-log-plus-plus](https://github.com/davidthebard/activity-log-plus-plus): base for the `.cia` settings (Unlicense).
- [hax0kartik/3dsdb](https://github.com/hax0kartik/3dsdb): 3DS game names.
- [GameTDB](https://www.gametdb.com/): box art (loaded from their site) and DS game names.
- [nayuki/QR-Code-generator](https://github.com/nayuki/QR-Code-generator) (MIT), [html2canvas](https://html2canvas.hertzen.com/) and the [Dosis](https://fonts.google.com/specimen/Dosis) font.

## License

[MIT](LICENSE). Fan project, not affiliated with Nintendo.
