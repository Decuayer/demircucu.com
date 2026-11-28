/* eslint-disable @next/next/no-html-link-for-pages -- the guard listens for plain anchors; next/link renders the same element. */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import tr from "@/messages/tr.json";
import {
  UnsavedBadge,
  UnsavedChangesProvider,
  useFormBaseline,
  useLeaveConfirm,
  useUnsavedChanges,
} from "./unsaved-changes";

const router = vi.hoisted(() => ({ push: vi.fn(), back: vi.fn(), pathname: "/tr/admin/blog/1" }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => router.pathname,
}));

/** A form with one field, a cancel button and a save that stays (or leaves). */
function Form({ leaveAfterSave = false }: { leaveAfterSave?: boolean }) {
  const [title, setTitle] = useState("Merhaba");
  const { dirty, markSaved } = useFormBaseline({ title });
  const { confirmLeave, leave } = useUnsavedChanges(dirty);
  return (
    <div>
      <label htmlFor="title">Başlık</label>
      <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <UnsavedBadge dirty={dirty} />
      <button type="button" onClick={() => confirmLeave(() => router.back())}>
        İptal
      </button>
      <button
        type="button"
        onClick={() => (leaveAfterSave ? leave(() => router.push("/tr/admin/blog")) : markSaved())}
      >
        Kaydet
      </button>
      <a href="/tr/admin/projects">Projeler</a>
      <a href="/tr/admin/blog/1#files">Dosyalar</a>
      <a href="/tr/admin/tags" target="_blank">
        Yeni sekme
      </a>
    </div>
  );
}

const renderForm = (props: { leaveAfterSave?: boolean } = {}) =>
  render(
    <NextIntlClientProvider locale="tr" messages={tr}>
      <UnsavedChangesProvider>
        <Form {...props} />
      </UnsavedChangesProvider>
    </NextIntlClientProvider>,
  );

const type = (value: string) =>
  fireEvent.change(screen.getByLabelText("Başlık"), { target: { value } });

/** Dispatches a cancelable beforeunload and reports whether the page asked to stay. */
function beforeUnloadHeld(): boolean {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

/** Clicks a link and reports whether the guard stopped it (the browser would have followed it). */
function clickHeld(name: string, init: MouseEventInit = {}): boolean {
  const link = screen.getByRole("link", { name });
  const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...init });
  // The guard listens on the document, outside React's event system.
  act(() => {
    link.dispatchEvent(event);
  });
  return event.defaultPrevented;
}

beforeEach(() => {
  window.history.replaceState(null, "", router.pathname);
  router.push.mockClear();
  router.back.mockClear();
});
afterEach(cleanup);

describe("unsaved changes", () => {
  it("does nothing while the form is untouched or changed back", () => {
    renderForm();
    expect(screen.queryByTestId("unsaved-badge")).toBeNull();
    expect(beforeUnloadHeld()).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "İptal" }));
    expect(router.back).toHaveBeenCalledOnce();

    type("Merhaba dünya");
    type("Merhaba");
    expect(screen.queryByTestId("unsaved-badge")).toBeNull();
    expect(clickHeld("Projeler")).toBe(false);
  });

  it("marks a changed form and holds reloads and links until confirmed", () => {
    renderForm();
    type("Yeni başlık");
    expect(screen.getByTestId("unsaved-badge")).toHaveTextContent("Kaydedilmemiş değişiklikler");
    expect(beforeUnloadHeld()).toBe(true);

    expect(clickHeld("Projeler")).toBe(true);
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Kaydedilmemiş değişiklikler var");
    fireEvent.click(screen.getByRole("button", { name: "Sayfada kal" }));
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Başlık")).toHaveValue("Yeni başlık");

    expect(clickHeld("Projeler")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Kaydetmeden çık" }));
    expect(router.push).toHaveBeenCalledWith("/tr/admin/projects");
    // Released until the next page shows: the redirect and reload are not held again.
    expect(beforeUnloadHeld()).toBe(false);
  });

  it("lets hash links, new tabs and modified clicks through", () => {
    renderForm();
    type("Yeni başlık");
    expect(clickHeld("Dosyalar")).toBe(false);
    expect(clickHeld("Yeni sekme")).toBe(false);
    expect(clickHeld("Projeler", { metaKey: true })).toBe(false);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("asks before the form's own cancel", () => {
    renderForm();
    type("Yeni başlık");
    fireEvent.click(screen.getByRole("button", { name: "İptal" }));
    expect(router.back).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Kaydetmeden çık" }));
    expect(router.back).toHaveBeenCalledOnce();
  });

  it("is clean again after saving in place, and does not hold a redirect after saving", () => {
    renderForm();
    type("Yeni başlık");
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(screen.queryByTestId("unsaved-badge")).toBeNull();
    expect(beforeUnloadHeld()).toBe(false);
    cleanup();

    renderForm({ leaveAfterSave: true });
    type("Yeni başlık");
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(router.push).toHaveBeenCalledWith("/tr/admin/blog");
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(beforeUnloadHeld()).toBe(false);
  });

  it("guards again when another form on the same page becomes dirty", () => {
    function Switcher() {
      const [id, setId] = useState("a");
      const { confirmLeave } = useLeaveConfirm();
      return (
        <>
          <button
            type="button"
            onClick={() => confirmLeave(() => setId((current) => (current === "a" ? "b" : "a")))}
          >
            Diğer etiket
          </button>
          <Form key={id} />
        </>
      );
    }
    render(
      <NextIntlClientProvider locale="tr" messages={tr}>
        <UnsavedChangesProvider>
          <Switcher />
        </UnsavedChangesProvider>
      </NextIntlClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Diğer etiket" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();

    type("Değişti");
    fireEvent.click(screen.getByRole("button", { name: "Diğer etiket" }));
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Kaydetmeden çık" }));
    });
    expect(screen.getByLabelText("Başlık")).toHaveValue("Merhaba");
    expect(beforeUnloadHeld()).toBe(false);

    type("Yine değişti");
    expect(beforeUnloadHeld()).toBe(true);
  });

  it("runs actions directly without a provider", () => {
    function Bare() {
      const { confirmLeave } = useUnsavedChanges(true);
      return (
        <button type="button" onClick={() => confirmLeave(() => router.back())}>
          Geri
        </button>
      );
    }
    render(<Bare />);
    fireEvent.click(screen.getByRole("button", { name: "Geri" }));
    expect(router.back).toHaveBeenCalledOnce();
  });
});
