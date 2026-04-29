import jsPDF from "jspdf";
import html2canvas from "html2canvas";

function forceSafeColors(root: HTMLElement) {
  const elements = root.querySelectorAll<HTMLElement>("*");

  const fallbackText = "#111827";
  const fallbackBg = "#ffffff";
  const fallbackBorder = "#e5e7eb";

  elements.forEach((el) => {
    const computed = window.getComputedStyle(el);

    const color = computed.color;
    const backgroundColor = computed.backgroundColor;
    const borderTopColor = computed.borderTopColor;
    const borderRightColor = computed.borderRightColor;
    const borderBottomColor = computed.borderBottomColor;
    const borderLeftColor = computed.borderLeftColor;

    if (color.includes("oklch")) {
      el.style.color = fallbackText;
    }

    if (backgroundColor.includes("oklch")) {
      el.style.backgroundColor = fallbackBg;
    }

    if (borderTopColor.includes("oklch")) {
      el.style.borderTopColor = fallbackBorder;
    }

    if (borderRightColor.includes("oklch")) {
      el.style.borderRightColor = fallbackBorder;
    }

    if (borderBottomColor.includes("oklch")) {
      el.style.borderBottomColor = fallbackBorder;
    }

    if (borderLeftColor.includes("oklch")) {
      el.style.borderLeftColor = fallbackBorder;
    }

    el.style.boxShadow = "none";
    el.style.textShadow = "none";
  });
}

export const exportToPDF = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);

  if (!element) return;

  const clonedElement = element.cloneNode(true) as HTMLElement;

  clonedElement.style.position = "fixed";
  clonedElement.style.left = "-10000px";
  clonedElement.style.top = "0";
  clonedElement.style.width = `${element.offsetWidth}px`;
  clonedElement.style.backgroundColor = "#ffffff";
  clonedElement.style.color = "#111827";
  clonedElement.style.zIndex = "-1";

  document.body.appendChild(clonedElement);

  try {
    forceSafeColors(clonedElement);

    const canvas = await html2canvas(clonedElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      onclone: (clonedDocument) => {
        const clonedRoot = clonedDocument.body.querySelector(
          `[id="${elementId}"]`
        ) as HTMLElement | null;

        if (clonedRoot) {
          forceSafeColors(clonedRoot);
        }
      },
    });

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");

    const imgProps = pdf.getImageProperties(imgData);

    const pdfWidth = pdf.internal.pageSize.getWidth();

    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

    pdf.save(`${filename}.pdf`);
  } finally {
    document.body.removeChild(clonedElement);
  }
};
