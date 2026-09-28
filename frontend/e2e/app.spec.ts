import { test, expect } from "@playwright/test";

test.describe("Medox Landing Page", () => {
  test("shows landing page at /", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("enter-app-btn")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Medox" })).toBeVisible();
    await expect(
      page.getByText("Assistant pharmaceutique intelligent"),
    ).toBeVisible();
    await expect(page.getByText("Mistral AI")).toBeVisible();
    await expect(page.getByText("data.gouv.fr")).toBeVisible();
  });

  test("enter button opens the chat", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("enter-app-btn").click();
    await expect(page).toHaveURL(/\/chat/);
    await expect(page.getByTestId("app")).toBeVisible();
  });
});

test.describe("Medox App", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chat");
  });

  test("loads the app with welcome screen", async ({ page }) => {
    await expect(page.getByTestId("app")).toBeVisible();
    await expect(page.getByTestId("welcome-screen")).toBeVisible();
    await expect(
      page.getByText("How can I help you?"),
    ).toBeVisible();
    await expect(
      page.getByText("BDPM & ANSM"),
    ).toBeVisible();
  });

  test("displays sidebar with MEDOX branding", async ({ page }) => {
    await expect(page.getByTestId("sidebar")).toBeVisible();
    await expect(page.getByTestId("new-chat-btn")).toBeVisible();
    await expect(page.getByTestId("settings-btn")).toBeVisible();
  });

  test("shows suggestion cards on welcome screen", async ({ page }) => {
    const suggestions = page.getByTestId("suggestion");
    await expect(suggestions).toHaveCount(4);
    await expect(suggestions.first()).toContainText("interactions");
  });

  test("displays chat input with placeholder", async ({ page }) => {
    const input = page.getByTestId("chat-input");
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute(
      "placeholder",
      "Ask about drug interactions, generics...",
    );
  });

  test("send button is disabled when input is empty", async ({ page }) => {
    const sendBtn = page.getByTestId("send-btn");
    await expect(sendBtn).toBeDisabled();
  });

  test("send button enables when text is entered", async ({ page }) => {
    const input = page.getByTestId("chat-input");
    await input.fill("Test question");
    const sendBtn = page.getByTestId("send-btn");
    await expect(sendBtn).toBeEnabled();
  });

  test("disclaimer text is visible", async ({ page }) => {
    await expect(
      page.getByText("Medox can make mistakes"),
    ).toBeVisible();
  });
});

test.describe("Medox Sidebar", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chat");
  });

  test("new chat button creates a conversation", async ({ page }) => {
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
              thread_id: "test-thread-1",
              metadata: {},
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }),
          });
        }
      }
    });

    await page.getByTestId("new-chat-btn").click();
    await expect(page.getByTestId("chat-input")).toBeVisible();
  });

  test("shows no conversations message when empty", async ({ page }) => {
    await page.route("**/api/threads/search", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.goto("/chat");
    await expect(page.getByText("No conversations yet")).toBeVisible();
  });

  test("displays conversation list", async ({ page }) => {
    await page.route("**/api/threads/search", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            thread_id: "t1",
            metadata: { title: "Interactions amiodarone" },
            created_at: "2026-03-18T10:00:00Z",
            updated_at: "2026-03-18T10:00:00Z",
          },
          {
            thread_id: "t2",
            metadata: { title: "G\u00e9n\u00e9riques Doliprane" },
            created_at: "2026-03-18T09:00:00Z",
            updated_at: "2026-03-18T09:00:00Z",
          },
        ]),
      });
    });

    await page.goto("/chat");
    const items = page.getByTestId("thread-item");
    await expect(items).toHaveCount(2);
    await expect(items.first()).toContainText("Interactions amiodarone");
  });
});

test.describe("Medox Chat Messages", () => {
  test("sends a message and displays it", async ({ page }) => {
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

    await page.goto("/chat");
    const input = page.getByTestId("chat-input");
    await input.fill("Test question");
    await page.getByTestId("send-btn").click();

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

    await page.goto("/chat");
    await page.getByTestId("chat-input").fill("interactions?");
    await page.getByTestId("send-btn").click();

    await expect(page.getByTestId("warning-banner")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByTestId("warning-banner")).toContainText("DANGER");

    const badges = page.getByTestId("cis-badge");
    await expect(badges).toHaveCount(2);
  });
});

test.describe("Medox Mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("sidebar is hidden on mobile by default @mobile", async ({ page }) => {
    await page.goto("/chat");
    const sidebar = page.getByTestId("sidebar");
    await expect(sidebar).toHaveCSS("transform", /matrix/);
    const transform = await sidebar.evaluate(
      (el) => getComputedStyle(el).transform,
    );
    expect(transform).toMatch(/-\d+/);
  });

  test("hamburger menu opens sidebar on mobile @mobile", async ({ page }) => {
    await page.goto("/chat");
    await page.getByTestId("menu-btn").click();
    await expect(page.getByTestId("sidebar-overlay")).toBeVisible();
  });
});

test.describe("Medox Settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chat");
  });

  test("opens settings dialog from sidebar", async ({ page }) => {
    await page.getByTestId("settings-btn").click();
    await expect(page.getByTestId("settings-dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "SETTINGS" })).toBeVisible();
  });

  test("closes settings with X button", async ({ page }) => {
    await page.getByTestId("settings-btn").click();
    await expect(page.getByTestId("settings-dialog")).toBeVisible();
    await page.getByLabel("Close settings").click();
    await expect(page.getByTestId("settings-dialog")).not.toBeVisible();
  });

  test("closes settings with Escape key", async ({ page }) => {
    await page.getByTestId("settings-btn").click();
    await expect(page.getByTestId("settings-dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("settings-dialog")).not.toBeVisible();
  });

  test("closes settings by clicking backdrop", async ({ page }) => {
    await page.getByTestId("settings-btn").click();
    const dialog = page.getByTestId("settings-dialog");
    await expect(dialog).toBeVisible();
    // Click the backdrop (top-left corner, outside the modal)
    await dialog.click({ position: { x: 10, y: 10 } });
    await expect(dialog).not.toBeVisible();
  });

  test("shows conversation count", async ({ page }) => {
    await page.route("**/api/threads/search", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { thread_id: "t1", metadata: { title: "Chat 1" }, created_at: "2026-03-23T10:00:00Z", updated_at: "2026-03-23T10:00:00Z" },
          { thread_id: "t2", metadata: { title: "Chat 2" }, created_at: "2026-03-23T09:00:00Z", updated_at: "2026-03-23T09:00:00Z" },
        ]),
      });
    });
    await page.goto("/chat");
    await page.getByTestId("settings-btn").click();
    await expect(page.getByText("2 conversations")).toBeVisible();
  });

  test("delete all button requires confirmation", async ({ page }) => {
    await page.route("**/api/threads/search", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { thread_id: "t1", metadata: { title: "Chat 1" }, created_at: "2026-03-23T10:00:00Z", updated_at: "2026-03-23T10:00:00Z" },
        ]),
      });
    });
    await page.goto("/chat");
    await page.getByTestId("settings-btn").click();
    const btn = page.getByTestId("delete-all-btn");
    await expect(btn).toContainText("Delete all");
    await btn.click();
    await expect(btn).toContainText("Confirm");
  });

  test("shows about section with version", async ({ page }) => {
    await page.getByTestId("settings-btn").click();
    await expect(page.getByText("0.2.3")).toBeVisible();
    await expect(page.getByText("BDPM + ANSM")).toBeVisible();
    await expect(page.getByText("ministral-8b")).toBeVisible();
  });
});
