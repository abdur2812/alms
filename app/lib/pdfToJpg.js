// Turn react-pdf output (a PDF Blob) into JPEG images in the browser.
//
// Kept deliberately light:
//  - pdf.js is loaded lazily, only when an export is actually requested
//  - a single pdf.js worker is reused for every document in a batch
//  - pages are rasterised one at a time on one reused canvas, then released
//  - ~150 dpi (A4 → 1240px wide) at JPEG quality 0.85 gives crisp text at
//    roughly 150-250 KB per page

const SCALE = 2; // PDF points → pixels (595pt A4 → ~1190px)
const QUALITY = 0.85;

export async function createJpgRenderer({ scale = SCALE, quality = QUALITY } = {}) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const worker = new pdfjs.PDFWorker();
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { alpha: false });

  return {
    // → array of JPEG Blobs, one per PDF page
    async render(pdfBlob) {
      const data = new Uint8Array(await pdfBlob.arrayBuffer());
      const doc = await pdfjs.getDocument({ data, worker, isEvalSupported: false }).promise;
      const out = [];
      try {
        for (let n = 1; n <= doc.numPages; n++) {
          const page = await doc.getPage(n);
          const viewport = page.getViewport({ scale });
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport, background: "#ffffff" }).promise;
          page.cleanup();
          out.push(await new Promise((res, rej) =>
            canvas.toBlob((b) => (b ? res(b) : rej(new Error("JPEG encode failed"))), "image/jpeg", quality),
          ));
        }
      } finally {
        await doc.destroy();
      }
      return out;
    },
    close() {
      canvas.width = canvas.height = 0;
      worker.destroy();
    },
  };
}

export async function pdfBlobToJpgs(pdfBlob, opts) {
  const r = await createJpgRenderer(opts);
  try {
    return await r.render(pdfBlob);
  } finally {
    r.close();
  }
}

export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// Save the rendered pages: one page → `<base>.jpg`; several → `<base>.zip`
// containing `<base>-1.jpg`, `<base>-2.jpg`, …
export async function saveJpgs(jpgs, baseName) {
  if (jpgs.length === 1) {
    saveBlob(jpgs[0], `${baseName}.jpg`);
    return;
  }
  const JSZipMod = await import("jszip");
  const JSZip = JSZipMod.default || JSZipMod;
  const zip = new JSZip();
  jpgs.forEach((b, i) => zip.file(`${baseName}-${i + 1}.jpg`, b));
  // JPEGs are already compressed; STORE avoids wasted CPU.
  saveBlob(await zip.generateAsync({ type: "blob", compression: "STORE" }), `${baseName}.zip`);
}
