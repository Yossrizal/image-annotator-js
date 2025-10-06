# Vanilla Image Annotator

Standalone HTML/CSS/JS demo that renders an annotated image from `data.json` with zoom controls and a hover-driven marker sidebar (view-only).

## How to run

1. Serve the folder with any static server:
   ```bash
   npx serve .
   # or
   python3 -m http.server
   ```
2. Open the served URL (e.g. http://localhost:8000/vanilla-annotator/).

The script fetches `data.json`, displays the image, and shows annotations in the sidebar. Hover or focus on an annotation to highlight the corresponding marker on the image. Use the buttons or `Ctrl + mouse wheel` to zoom.
