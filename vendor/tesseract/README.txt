OPTIONAL — for OCR that works offline from the very first run.

Put these files here (all from the tesseract.js releases / CDN):

  vendor/tesseract/tesseract.min.js        (tesseract.js@5 dist)
  vendor/tesseract/worker.min.js           (tesseract.js@5 dist)
  vendor/tesseract/core/                   (tesseract.js-core@5 files)
  vendor/tesseract/lang/eng.traineddata    (or eng.traineddata.gz)

If tesseract.min.js is found here, the app uses these local copies and never
touches the internet. If not, it downloads them once from a CDN and caches
them in your browser (IndexedDB), which is fine for almost everyone.

Note: local files are only readable when the app is served over http://
(e.g. `python -m http.server 8000`), not from a file:// page.
