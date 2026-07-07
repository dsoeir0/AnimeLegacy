# Disk & image cache — operator runbook

The Next.js image optimizer (`<Image>` → Sharp) writes one file per `(url, size, format)` triple to `.next/cache/images` on the VPS. Next **never evicts** this cache, so it grows for the life of the process. With thousands of anime/character/voice covers it reaches millions of tiny files and exhausts the disk's **inodes** long before it fills the bytes.

This bit us on 2026-06-01: `.next/cache/images` held ~2.3M files, `df -i` was at 100% with ~2.3G of bytes still free, and **every** write failed with `No space left on device` (including editing the Caddyfile and the next build).

## Symptom

`No space left on device` on any write, even tiny ones, while `df -h` shows free space. The tell is inodes, not bytes.

## Diagnose

```bash
df -i /          # IUse% — if 100% / IFree 0, it's inodes, not bytes
df -h /          # bytes, for comparison

# where the inodes are (counts files, not size):
sudo du -xd1 --inodes / 2>/dev/null | sort -rn | head
sudo du -xd3 --inodes /home 2>/dev/null | sort -rn | head
du -xd1 --inodes ~/apps/animelegacy/.next/cache 2>/dev/null | sort -rn
```

Expect `~/apps/animelegacy/.next/cache/images` to dominate.

## Fix it now

The app keeps writing new cache files while you delete, so a plain `rm -rf` on the live directory loses the race (`Directory not empty`). Rename it aside first — rename is atomic and allocates no inodes, so it works even at 100% — then delete the moved copy while the app writes to a fresh `images/`:

```bash
mv ~/apps/animelegacy/.next/cache/images ~/apps/animelegacy/.next/cache/images.delete-me
rm -rf ~/apps/animelegacy/.next/cache/images.delete-me
df -i /
```

No restart needed; Next recreates `images/` on the next request. Each image re-optimizes once on first hit (one-time CPU), then is cached again.

## What prevents recurrence

Two layers, already in place:

1. **Weekly prune** — systemd timer `al-imgcache-clean.timer` on the VPS fires Sundays 04:00 UTC and runs `/usr/local/bin/imgclean`:

   ```sh
   #!/bin/sh
   cd /home/duarte/apps/animelegacy/.next/cache/images || exit 0
   find . -type f -mtime +14 -delete
   ```

   Evicts entries older than 14 days (keeps hot covers, drops cold ones). Check it:

   ```bash
   systemctl list-timers al-imgcache-clean.timer
   systemctl cat al-imgcache-clean.service al-imgcache-clean.timer
   sudo systemctl start al-imgcache-clean.service   # run once now
   ```

   Unit files live at `/etc/systemd/system/al-imgcache-clean.{service,timer}` — server-only, not in the repo, untouched by the deploy pipeline.

2. **Fewer variants** — `next.config.js` caps `deviceSizes` and `imageSizes` to 4 widths each and sets `minimumCacheTTL` to 31 days, so each cover produces fewer files and re-optimizes less often. Widening those arrays multiplies the file count — weigh that before changing them.

## VPS terminal note

Both the Hetzner web console and the SSH terminal hard-wrap pasted lines at ~80 chars and auto-indent each line by 2 spaces. That breaks heredocs (an indented closing `EOF` never terminates) and splits long commands. When pasting commands to the server, keep every line under ~78 chars, avoid heredocs, and put long commands in a short-path wrapper script (as `imgclean` above) rather than inline in `ExecStart`.
