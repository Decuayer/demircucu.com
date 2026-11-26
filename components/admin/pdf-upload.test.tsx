import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import tr from "@/messages/tr.json";
import { PdfUpload } from "./pdf-upload";

const { upload, toast } = vi.hoisted(() => ({
  upload: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/media/upload-client", () => ({
  uploadToMediaLibrary: (...args: unknown[]) => upload(...args),
}));
vi.mock("sonner", () => ({ toast }));

function Harness({ initial = "", onChange }: { initial?: string; onChange?: (v: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <NextIntlClientProvider locale="tr" messages={tr}>
      <PdfUpload
        id="cv"
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange?.(next);
        }}
      />
    </NextIntlClientProvider>
  );
}

const pick = (file: File) =>
  fireEvent.change(document.getElementById("cv")!, { target: { files: [file] } });

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("PdfUpload", () => {
  it("shows the empty state with a labelled file input", () => {
    render(<Harness />);
    expect(screen.getByTestId("cv-name")).toHaveTextContent("Dosya seçilmedi");
    expect(document.getElementById("cv")).toHaveAttribute("accept", "application/pdf");
    expect(screen.getByRole("button", { name: "PDF seç" })).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("uploads a PDF and reports the stored path", async () => {
    upload.mockResolvedValue({ ok: true, path: "settings/abc.pdf" });
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    pick(new File(["%PDF-1.4"], "cv.pdf", { type: "application/pdf" }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith("settings/abc.pdf"));
    expect(upload).toHaveBeenCalledWith(expect.any(File), "settings");
    expect(toast.success).toHaveBeenCalled();
    expect(screen.getByTestId("cv-name")).toHaveTextContent("abc.pdf");
    expect(screen.getByRole("link", { name: "PDF'i yeni sekmede aç" })).toHaveAttribute(
      "href",
      "https://project.supabase.co/storage/v1/object/public/media/settings/abc.pdf",
    );
    expect(screen.getByRole("button", { name: "Değiştir" })).toBeInTheDocument();
  });

  it("refuses other file types and shows upload errors", async () => {
    render(<Harness />);
    pick(new File(["x"], "photo.png", { type: "image/png" }));
    expect(toast.error).toHaveBeenCalledWith("Lütfen bir PDF dosyası seçin.");
    expect(upload).not.toHaveBeenCalled();

    upload.mockResolvedValue({ ok: false, error: "tooLarge" });
    pick(new File(["%PDF"], "big.pdf", { type: "application/pdf" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId("cv-name")).toHaveTextContent("Dosya seçilmedi");
  });

  it("removes the file", () => {
    const onChange = vi.fn();
    render(<Harness initial="settings/old.pdf" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Kaldır" }));
    expect(onChange).toHaveBeenCalledWith("");
    expect(screen.getByTestId("cv-name")).toHaveTextContent("Dosya seçilmedi");
  });
});
