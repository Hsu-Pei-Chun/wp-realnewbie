// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TocHeading } from "@/lib/toc-utils";
import { TableOfContents } from "./table-of-contents";

class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const headings: TocHeading[] = [
  { id: "intro", text: "Intro", level: 2 },
  { id: "details", text: "Details", level: 3 },
];

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.spyOn(window.history, "pushState").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("TableOfContents", () => {
  it("renders nothing when there are no headings", () => {
    const { container } = render(<TableOfContents headings={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a link per heading, indenting level-3 items", () => {
    render(<TableOfContents headings={headings} />);

    expect(screen.getByRole("link", { name: "Intro" })).toHaveAttribute(
      "href",
      "#intro"
    );
    const detailsLink = screen.getByRole("link", { name: "Details" });
    expect(detailsLink).toHaveAttribute("href", "#details");
    expect(detailsLink.closest("li")).toHaveClass("pl-3");
  });

  it("scrolls to and activates the target heading on click", async () => {
    const target = document.createElement("h2");
    target.id = "intro";
    document.body.appendChild(target);

    const user = userEvent.setup();
    render(<TableOfContents headings={headings} />);

    await user.click(screen.getByRole("link", { name: "Intro" }));

    expect(window.scrollTo).toHaveBeenCalled();
    expect(window.history.pushState).toHaveBeenCalledWith(null, "", "#intro");
    expect(screen.getByRole("link", { name: "Intro" })).toHaveClass(
      "text-primary"
    );

    document.body.removeChild(target);
  });
});
