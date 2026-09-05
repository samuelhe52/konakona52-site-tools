(async () => {
  const viewer = [...document.querySelectorAll("iframe")]
    .map((frame) => {
      try {
        return new URL(frame.src, location.href);
      } catch {
        return null;
      }
    })
    .find((url) => url?.searchParams.get("file")?.toLowerCase().includes(".pdf"));

  if (!viewer) {
    throw new Error("No PDF.js iframe containing a PDF was found.");
  }

  const file = viewer.searchParams.get("file");
  const pdfURL = new URL(file, viewer.origin);
  const response = await fetch(pdfURL, { credentials: "include" });

  if (!response.ok) {
    throw new Error(`PDF request failed: HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/pdf")) {
    throw new Error(`Expected a PDF, received: ${contentType || "unknown type"}`);
  }

  console.log("PDF URL declared by the viewer:", pdfURL.href);
  if (response.url !== pdfURL.href) {
    console.log("Final fetched URL:", response.url);
  }

  const blobURL = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = blobURL;
  link.download = decodeURIComponent(pdfURL.pathname.split("/").pop() || "document.pdf");
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(blobURL), 60_000);
})();
