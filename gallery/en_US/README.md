# Gallary entries

The gallery sources its items from the notes in this folder — one markdown file
per item, enumerated by `manifest.json`.

A video is input the wiki way: a raw `video` tag whose relative `src` resolves
against this folder's source root (assets live under the repo root). A
`gallery-layout` comment picks the layout; the text is the note's own markdown.

    <!-- gallery-layout: video-left -->

    <video src="../../assets/videos/placeholder.mp4" muted autoplay loop playsinline preload="auto"></video>

Supported layouts: `video-left` (video left, text right), `video-right`
(video right, text left), `video-center` (video big in the middle, text below).

The bilibili-style grid under the big items is sourced from `grid.md`
(`data-grid-path` on the page): one raw `video` tag per line, no text — each
becomes a 16:9 cell with a duration badge, 4 per row (2 on phones). Hover a
cell to play its video; double-click it for fullscreen.
