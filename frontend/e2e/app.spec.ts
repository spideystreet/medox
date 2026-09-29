import { test, expect } from "@playwright/test";

test.describe("Medox Landing Page", () => {
  test("shows landing page at /", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("landing")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Ne cherchez plus. Demandez." }),
    ).toBeVisible();
    await expect(page.getByText("Il interroge la BDPM")).toBeVisible();
    await expect(page.getByText("Mistral AI")).toBeVisible();
    await expect(page.getByText("data.gouv.fr")).toBeVisible();
    await expect(page.getByTestId("github-link")).toBeVisible();
    await expect(page.getByTestId("enter-app-btn")).toHaveCount(0);
    await expect(page.getByText("Agent", { exact: true })).toHaveCount(0);
    await expect(page.getByTestId("data-freshness")).toContainText(
      "Base à jour · BDPM mars 2026 · ANSM 15 sept. 2023",
    );
  });

  test("suggestion chips are centered under the composer", async ({ page }) => {
    await page.goto("/");
    const composer = page.getByTestId("composer");
    const chips = composer.locator("button", {
      hasText: "Interactions amiodarone et warfarine",
    });
    await expect(chips).toBeVisible();
    const row = chips.locator("xpath=..");
    await expect(row).toHaveCSS("justify-content", "center");
  });

  test("/chat redirects to the landing page", async ({ page }) => {
    await page.goto("/chat");
    await expect(page).toHaveURL("/");
    await expect(page.getByTestId("landing")).toBeVisible();
  });

  test("/setup redirects to the landing page", async ({ page }) => {
    await page.goto("/setup");
    await expect(page).toHaveURL("/");
    await expect(page.getByTestId("landing")).toBeVisible();
  });
});

test.describe("Medox Composer Chat", () => {
  test("send button is disabled when input is empty", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("send-btn")).toBeDisabled();
  });

  test("send button enables when text is entered", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("chat-input").fill("Test question");
    await expect(page.getByTestId("send-btn")).toBeEnabled();
  });

  test("sends a message inside the expanding composer", async ({ page }) => {
    await page.route("**/api/threads", async (route) => {
      if (route.request().method() === "POST") {
        const url = route.request().url();
        if (url.endsWith("/search")) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([]),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              thread_id: "test-thread-msg",
              metadata: {},
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }),
          });
        }
      } else {
        await route.continue();
      }
    });

    await page.route("**/api/threads/*/runs/stream", async (route) => {
      const body = [
        'event: metadata\ndata: {"run_id": "r1"}\n\n',
        'event: messages/partial\ndata: [{"content": "Test response from Medox", "type": "ai", "id": "a1"}]\n\n',
        "event: end\ndata: null\n\n",
      ].join("");

      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body,
      });
    });

    await page.route("**/api/threads/*/state", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          values: {
            messages: [
              { type: "human", content: "Test question", id: "msg-1" },
              {
                type: "ai",
                content: "Test response from Medox",
                id: "msg-2",
              },
            ],
          },
        }),
      });
    });

    await page.goto("/");
    await expect(page).toHaveURL("/");
    const input = page.getByTestId("chat-input");
    await input.fill("Test question");
    await page.getByTestId("send-btn").click();

    await expect(page).toHaveURL("/");
    await expect(page.getByTestId("composer-thread")).toBeVisible();
    await expect(page.getByTestId("user-message").first()).toBeVisible();
    await expect(page.getByTestId("user-message").first()).toContainText(
      "Test question",
    );
  });

  test("displays warning banner for critical interactions", async ({
    page,
  }) => {
    await page.route("**/api/threads/search", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.route("**/api/threads", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            thread_id: "warn-thread",
            metadata: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.route("**/api/threads/*/runs/stream", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: 'event: messages/partial\ndata: [{"content": "done", "type": "ai", "id": "a1"}]\n\nevent: end\ndata: null\n\n',
      });
    });

    await page.route("**/api/threads/*/state", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          values: {
            messages: [
              { type: "human", content: "interactions?", id: "m1" },
              {
                type: "ai",
                content:
                  "\u26a0\ufe0f **Contre-indication** : Ne pas associer ces deux m\u00e9dicaments.\n\nSOURCES\nCIS 34009375\nCIS 34009123",
                id: "m2",
              },
            ],
          },
        }),
      });
    });

    await page.goto("/");
    await page.getByTestId("chat-input").fill("interactions?");
    await page.getByTestId("send-btn").click();

    await expect(page.getByTestId("warning-banner")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByTestId("warning-banner")).toContainText("Contre-indication");

    await expect(page.getByTestId("cis-badge")).toHaveCount(0);
    await page.getByTestId("sources-badge").click();
    await expect(page.getByTestId("cis-badge")).toHaveCount(2);
  });
});
